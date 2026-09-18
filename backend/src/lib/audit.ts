import type { Prisma, PrismaClient } from "@prisma/client";

type TxClient = PrismaClient | Prisma.TransactionClient;

export async function writeAudit(
  tx: TxClient,
  params: {
    tableName: string;
    recordId: string;
    action: "INSERT" | "UPDATE" | "DELETE";
    changedBy: string | null;
    oldValues?: unknown;
    newValues?: unknown;
  }
) {
  await tx.auditLog.create({
    data: {
      tableName: params.tableName,
      recordId: params.recordId,
      action: params.action,
      changedBy: params.changedBy,
      oldValues: params.oldValues !== undefined ? JSON.stringify(params.oldValues) : null,
      newValues: params.newValues !== undefined ? JSON.stringify(params.newValues) : null,
    },
  });
}
