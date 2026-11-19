import { readFile } from "fs/promises";
import path from "path";
import { Pool, type QueryResultRow } from "pg";
import type {
  Activity,
  Cashout,
  Claim,
  ClaimStatus,
  Otp,
  Session,
  Sponsor,
  Store,
  User,
} from "./types";

type UserRow = {
  phone: string;
  public_key: string;
  encrypted_secret: string;
  status: User["status"];
  created_at: Date | string;
};

type OtpRow = {
  phone: string;
  code_hash: string;
  expires_at: Date | string;
  attempts: number;
};

type SessionRow = {
  token_hash: string;
  phone: string;
  expires_at: Date | string;
};

type ClaimRow = {
  id: string;
  sender_phone: string;
  recipient_phone: string;
  asset: Claim["asset"];
  amount: string;
  balance_id: string | null;
  recipient_public_key: string;
  encrypted_recipient_secret: string;
  status: Claim["status"];
  tx_hash: string | null;
  claim_tx_hash: string | null;
  created_at: Date | string;
  expires_at: Date | string;
};

type ActivityRow = {
  id: string;
  owner_phone: string;
  kind: string;
  title: string;
  asset: Activity["asset"];
  amount: string;
  direction: Activity["direction"];
  counterparty: string | null;
  tx_hash: string | null;
  claim_id: string | null;
  created_at: Date | string;
};

type CashoutRow = {
  id: string;
  phone: string;
  asset: Cashout["asset"];
  amount: string;
  provider: Cashout["provider"];
  anchor_tx_id: string | null;
  status: string;
  interactive_url: string | null;
  stellar_tx_hash: string | null;
  detail: string | null;
  created_at: Date | string;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapUser(row: UserRow): User {
  return {
    phone: row.phone,
    publicKey: row.public_key,
    encryptedSecret: row.encrypted_secret,
    status: row.status,
    createdAt: iso(row.created_at),
  };
}

function mapClaim(row: ClaimRow): Claim {
  return {
    id: row.id,
    senderPhone: row.sender_phone,
    recipientPhone: row.recipient_phone,
    asset: row.asset,
    amount: row.amount,
    balanceId: row.balance_id,
    recipientPublicKey: row.recipient_public_key,
    encryptedRecipientSecret: row.encrypted_recipient_secret,
    status: row.status,
    txHash: row.tx_hash,
    claimTxHash: row.claim_tx_hash,
    createdAt: iso(row.created_at),
    expiresAt: iso(row.expires_at),
  };
}

function mapActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    ownerPhone: row.owner_phone,
    kind: row.kind,
    title: row.title,
    asset: row.asset,
    amount: row.amount,
    direction: row.direction,
    counterparty: row.counterparty,
    txHash: row.tx_hash,
    claimId: row.claim_id,
    createdAt: iso(row.created_at),
  };
}

function mapCashout(row: CashoutRow): Cashout {
  return {
    id: row.id,
    phone: row.phone,
    asset: row.asset,
    amount: row.amount,
    provider: row.provider,
    anchorTxId: row.anchor_tx_id,
    status: row.status,
    interactiveUrl: row.interactive_url,
    stellarTxHash: row.stellar_tx_hash,
    detail: row.detail,
    createdAt: iso(row.created_at),
  };
}

export class PostgresStore implements Store {
  private constructor(private pool: Pool) {}

  static async connect(url: string, options: { autoMigrate: boolean }): Promise<PostgresStore> {
    const pool = new Pool({ connectionString: url, max: 1 });
    const store = new PostgresStore(pool);
    if (options.autoMigrate) {
      const schemaPath = path.join(
        process.cwd(),
        "netlify/database/migrations/20261119170000_init/migration.sql",
      );
      const sql = await readFile(schemaPath, "utf8");
      await pool.query(sql);
    }
    return store;
  }

  private async rows<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.pool.query<T>(text, params);
    return result.rows;
  }

  async getUser(phone: string): Promise<User | null> {
    const [row] = await this.rows<UserRow>("SELECT * FROM users WHERE phone = $1", [phone]);
    return row ? mapUser(row) : null;
  }

  async insertUser(user: User): Promise<User> {
    await this.rows(
      `INSERT INTO users (phone, public_key, encrypted_secret, status, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.phone, user.publicKey, user.encryptedSecret, user.status, user.createdAt],
    );
    return user;
  }

  async updateUser(phone: string, patch: Partial<Pick<User, "status">>): Promise<void> {
    if (!patch.status) return;
    await this.rows("UPDATE users SET status = $2 WHERE phone = $1", [phone, patch.status]);
  }

  async saveOtp(otp: Otp): Promise<void> {
    await this.rows(
      `INSERT INTO otps (phone, code_hash, expires_at, attempts)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone) DO UPDATE SET code_hash = $2, expires_at = $3, attempts = $4`,
      [otp.phone, otp.codeHash, otp.expiresAt, otp.attempts],
    );
  }

  async getOtp(phone: string): Promise<Otp | null> {
    const [row] = await this.rows<OtpRow>("SELECT * FROM otps WHERE phone = $1", [phone]);
    if (!row) return null;
    return {
      phone: row.phone,
      codeHash: row.code_hash,
      expiresAt: iso(row.expires_at),
      attempts: row.attempts,
    };
  }

  async incrementOtpAttempts(phone: string): Promise<void> {
    await this.rows("UPDATE otps SET attempts = attempts + 1 WHERE phone = $1", [phone]);
  }

  async deleteOtp(phone: string): Promise<void> {
    await this.rows("DELETE FROM otps WHERE phone = $1", [phone]);
  }

  async saveSession(session: Session): Promise<void> {
    await this.rows(
      `INSERT INTO sessions (token_hash, phone, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (token_hash) DO UPDATE SET phone = $2, expires_at = $3`,
      [session.tokenHash, session.phone, session.expiresAt],
    );
  }

  async getSession(tokenHash: string): Promise<Session | null> {
    const [row] = await this.rows<SessionRow>("SELECT * FROM sessions WHERE token_hash = $1", [tokenHash]);
    if (!row) return null;
    return { tokenHash: row.token_hash, phone: row.phone, expiresAt: iso(row.expires_at) };
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.rows("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
  }

  async insertClaim(claim: Claim): Promise<Claim> {
    await this.rows(
      `INSERT INTO claims (
        id, sender_phone, recipient_phone, asset, amount, balance_id, recipient_public_key,
        encrypted_recipient_secret, status, tx_hash, claim_tx_hash, created_at, expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        claim.id,
        claim.senderPhone,
        claim.recipientPhone,
        claim.asset,
        claim.amount,
        claim.balanceId,
        claim.recipientPublicKey,
        claim.encryptedRecipientSecret,
        claim.status,
        claim.txHash,
        claim.claimTxHash,
        claim.createdAt,
        claim.expiresAt,
      ],
    );
    return claim;
  }

  async getClaim(id: string): Promise<Claim | null> {
    const [row] = await this.rows<ClaimRow>("SELECT * FROM claims WHERE id = $1", [id]);
    return row ? mapClaim(row) : null;
  }

  async updateClaim(
    id: string,
    patch: Partial<Pick<Claim, "status" | "balanceId" | "txHash" | "claimTxHash">>,
  ): Promise<void> {
    await this.rows(
      `UPDATE claims SET
        status = COALESCE($2, status),
        balance_id = COALESCE($3, balance_id),
        tx_hash = COALESCE($4, tx_hash),
        claim_tx_hash = COALESCE($5, claim_tx_hash)
       WHERE id = $1`,
      [id, patch.status ?? null, patch.balanceId ?? null, patch.txHash ?? null, patch.claimTxHash ?? null],
    );
  }

  async listClaimsByRecipient(phone: string, status?: ClaimStatus): Promise<Claim[]> {
    const rows = status
      ? await this.rows<ClaimRow>(
          "SELECT * FROM claims WHERE recipient_phone = $1 AND status = $2 ORDER BY created_at DESC",
          [phone, status],
        )
      : await this.rows<ClaimRow>(
          "SELECT * FROM claims WHERE recipient_phone = $1 ORDER BY created_at DESC",
          [phone],
        );
    return rows.map(mapClaim);
  }

  async listClaimsBySender(phone: string): Promise<Claim[]> {
    const rows = await this.rows<ClaimRow>(
      "SELECT * FROM claims WHERE sender_phone = $1 ORDER BY created_at DESC",
      [phone],
    );
    return rows.map(mapClaim);
  }

  async addActivity(activity: Activity): Promise<void> {
    await this.rows(
      `INSERT INTO activities (
        id, owner_phone, kind, title, asset, amount, direction, counterparty, tx_hash, claim_id, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        activity.id,
        activity.ownerPhone,
        activity.kind,
        activity.title,
        activity.asset,
        activity.amount,
        activity.direction,
        activity.counterparty,
        activity.txHash,
        activity.claimId,
        activity.createdAt,
      ],
    );
  }

  async listActivity(phone: string, limit = 30): Promise<Activity[]> {
    const rows = await this.rows<ActivityRow>(
      "SELECT * FROM activities WHERE owner_phone = $1 ORDER BY created_at DESC LIMIT $2",
      [phone, limit],
    );
    return rows.map(mapActivity);
  }

  async getSponsor(): Promise<Sponsor | null> {
    const [row] = await this.rows<{ public_key: string; encrypted_secret: string }>(
      "SELECT public_key, encrypted_secret FROM sponsor WHERE id = 1",
    );
    if (!row) return null;
    return { publicKey: row.public_key, encryptedSecret: row.encrypted_secret };
  }

  async saveSponsor(sponsor: Sponsor): Promise<void> {
    await this.rows(
      `INSERT INTO sponsor (id, public_key, encrypted_secret) VALUES (1, $1, $2)
       ON CONFLICT (id) DO UPDATE SET public_key = $1, encrypted_secret = $2`,
      [sponsor.publicKey, sponsor.encryptedSecret],
    );
  }

  async insertCashout(cashout: Cashout): Promise<Cashout> {
    await this.rows(
      `INSERT INTO cashouts (
        id, phone, asset, amount, provider, anchor_tx_id, status, interactive_url, stellar_tx_hash, detail, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        cashout.id,
        cashout.phone,
        cashout.asset,
        cashout.amount,
        cashout.provider,
        cashout.anchorTxId,
        cashout.status,
        cashout.interactiveUrl,
        cashout.stellarTxHash,
        cashout.detail,
        cashout.createdAt,
      ],
    );
    return cashout;
  }

  async getCashout(id: string): Promise<Cashout | null> {
    const [row] = await this.rows<CashoutRow>("SELECT * FROM cashouts WHERE id = $1", [id]);
    return row ? mapCashout(row) : null;
  }

  async updateCashout(
    id: string,
    patch: Partial<Pick<Cashout, "anchorTxId" | "status" | "interactiveUrl" | "stellarTxHash" | "detail">>,
  ): Promise<void> {
    await this.rows(
      `UPDATE cashouts SET
        anchor_tx_id = COALESCE($2, anchor_tx_id),
        status = COALESCE($3, status),
        interactive_url = COALESCE($4, interactive_url),
        stellar_tx_hash = COALESCE($5, stellar_tx_hash),
        detail = COALESCE($6, detail)
       WHERE id = $1`,
      [
        id,
        patch.anchorTxId ?? null,
        patch.status ?? null,
        patch.interactiveUrl ?? null,
        patch.stellarTxHash ?? null,
        patch.detail ?? null,
      ],
    );
  }

  async listCashouts(phone: string): Promise<Cashout[]> {
    const rows = await this.rows<CashoutRow>(
      "SELECT * FROM cashouts WHERE phone = $1 ORDER BY created_at DESC",
      [phone],
    );
    return rows.map(mapCashout);
  }
}
