import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModelNameEnum } from '@redplanethq/sol-sdk';
import { Client } from 'pg';
import {
  LogicalReplicationService,
  Wal2JsonPlugin,
} from 'pg-logical-replication';
import { v4 as uuidv4 } from 'uuid';

import { LoggerService } from 'modules/logger/logger.service';
import { SyncGateway } from 'modules/sync/sync.gateway';
import SyncActionsService from 'modules/sync-actions/sync-actions.service';

import {
  logChangeType,
  logType,
  tableHooks,
  tablesToSendMessagesFor,
} from './replication.interface';

const REPLICATION_SLOT_PLUGIN = 'wal2json';

@Injectable()
export default class ReplicationService {
  client: Client;
  private readonly logger: LoggerService = new LoggerService(
    'ReplicationService',
  );
  private replicationSlotName = `sol_replication_slot_${uuidv4().replace(/-/g, '')}`;

  constructor(
    private configService: ConfigService,
    private syncGateway: SyncGateway,
    private syncActionsService: SyncActionsService,
  ) {
    this.client = new Client({
      connectionString: configService.get('DATABASE_URL'),
    });
  }

  async init() {
    await this.client.connect();

    await this.deleteOrphanedSlots();
    await this.createReplicationSlot();
    await this.setupReplication();
    await this.setupReplicationIdentity();
  }

  async deleteOrphanedSlots() {
    try {
      // Query to find all inactive replication slots
      const findInactiveSlotsQuery = `
        SELECT slot_name 
        FROM pg_replication_slots 
        WHERE active = false;
      `;

      const result = await this.client.query(findInactiveSlotsQuery);

      // Loop through and delete each inactive slot
      for (const row of result.rows) {
        const slotName = row.slot_name;
        try {
          await this.deleteSlot(slotName);
          this.logger.info({
            message: `Orphaned replication slot ${slotName} deleted successfully.`,
            where: `ReplicationService.deleteOrphanedSlots`,
          });
        } catch (error) {
          this.logger.error({
            message: `Error deleting replication slot ${slotName}:`,
            where: `ReplicationService.deleteOrphanedSlots`,
            error,
          });
        }
      }
    } catch (error) {
      this.logger.error({
        message: 'Error finding or deleting orphaned replication slots:',
        where: `ReplicationService.deleteOrphanedSlots`,
        error,
      });
    }
  }

  async deleteSlot(name: string) {
    try {
      const deleteReplicationSlotQuery = `SELECT pg_drop_replication_slot('${name}')`;

      await this.client.query(deleteReplicationSlotQuery);
    } catch (err) {
      this.logger.error({
        message: `Drop relication slot: ${JSON.stringify(err)}`,
      });
    }
  }

  async checkForSlot() {
    const checkReplicationSlotQuery = `
    SELECT * FROM pg_replication_slots WHERE slot_name = '${this.replicationSlotName}'
  `;

    const checkSlotResult = await this.client.query(checkReplicationSlotQuery);

    if (checkSlotResult.rows.length > 0) {
      await this.deleteSlot(this.replicationSlotName);
    }
  }

  async createReplicationSlot() {
    try {
      await this.checkForSlot();

      const createReplicationSlotQuery = `
        SELECT * FROM pg_create_logical_replication_slot(
          '${this.replicationSlotName}',
          '${REPLICATION_SLOT_PLUGIN}'
        )
      `;

      // Create replication slot
      const result = await this.client.query(createReplicationSlotQuery);

      this.logger.info({
        message: 'Replication slot created successfully:',
        where: `ReplicationService.createReplicationSlot`,
        payload: { row: result.rows[0] },
      });
    } catch (error) {
      this.logger.error({
        message: 'Error creating replication slot:',
        where: `ReplicationService.createReplicationSlot`,
        error,
      });
    }
  }

  getChangedData(change: logChangeType) {
    // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style, @typescript-eslint/no-explicit-any
    const changedData: { [key: string]: { oldValue: any; newValue: any } } = {};
    const keyNames = change.oldkeys?.keynames || [];
    const oldValues = change.oldkeys?.keyvalues || [];
    const columnNames = change.columnnames || [];
    const newValues = change.columnvalues || [];

    // Create a map of old values by key name
    // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style, @typescript-eslint/no-explicit-any
    const oldValueMap: { [key: string]: any } = {};
    keyNames.forEach((keyName, index) => {
      oldValueMap[keyName] = oldValues[index];
    });

    // Compare each column to see if the value has changed
    columnNames.forEach((columnName, index) => {
      const oldValue = oldValueMap[columnName];
      const newValue = newValues[index];

      // Check if the old value and new value are different
      if (
        oldValue !== newValue &&
        oldValue !== 'undefined' &&
        newValue !== null
      ) {
        changedData[columnName] = {
          oldValue,
          newValue,
        };
      }
    });

    return changedData;
  }

  async setupReplication() {
    const dbSchema = this.configService.get('DB_SCHEMA');

    const connectionString =
      this.configService.get('REPLICATION_DATABASE_URL') ||
      this.configService.get('DATABASE_URL');

    const service = new LogicalReplicationService({
      connectionString,
    });
    const plugin = new Wal2JsonPlugin({});
    service
      .subscribe(plugin, this.replicationSlotName)
      .catch((e) => {
        this.logger.error({ message: `WAL error: ${JSON.stringify(e)}` });
      })
      .then(() => {
        this.logger.info({
          message: 'Replication server connected',
          where: `ReplicationService.setupReplication`,
        });
      });

    service.on('data', (_lsn: string, log: logType) => {
      // log contains change data in JSON format
      if (log.change) {
        log.change.forEach(async (change: logChangeType) => {
          if (change.schema !== dbSchema || change.kind === 'delete') {
            return;
          }

          // Log or process the changed data
          const { columnvalues, columnnames } = change;
          const modelName = change.table as ModelNameEnum;
          const deletedIndex = columnnames?.indexOf('deleted');
          const isDeleted = deletedIndex !== -1 && !!columnvalues[deletedIndex];
          const idIndex = columnnames.indexOf('id');
          const modelId = columnvalues[idIndex];

          if (tablesToSendMessagesFor.has(modelName)) {
            const syncActionData =
              await this.syncActionsService.upsertSyncAction(
                _lsn,
                isDeleted ? 'delete' : change.kind,
                modelName,
                modelId,
                this.getChangedData(change),
              );

            const recipientId = syncActionData.workspaceId;

            this.syncGateway.wss
              .to(recipientId)
              .emit('message', JSON.stringify(syncActionData));
          }
        });
      } else {
        this.logger.info({ message: 'No change data in log' });
      }
    });
  }

  async setupReplicationIdentity() {
    try {
      for (const [tableName] of tableHooks) {
        const query = `ALTER TABLE ${this.configService.get('DB_SCHEMA')}."${tableName}" REPLICA IDENTITY FULL;`;
        await this.client.query(query);
        this.logger.info({
          message: `Set REPLICA IDENTITY FULL for table ${tableName}`,
          where: 'ReplicationService.setupReplicationIdentity',
        });
      }
    } catch (error) {
      this.logger.error({
        message: 'Error setting REPLICA IDENTITY',
        where: 'ReplicationService.setupReplicationIdentity',
        error,
      });
    }
  }
}
