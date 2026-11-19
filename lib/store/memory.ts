import type {
  Activity,
  Cashout,
  Claim,
  ClaimStatus,
  Database,
  Otp,
  Session,
  Sponsor,
  Store,
  User,
} from "./types";

export class MemoryStore implements Store {
  constructor(
    private db: Database,
    private onWrite?: () => Promise<void>,
  ) {}

  snapshot(): Database {
    return this.db;
  }

  private async touch(): Promise<void> {
    if (this.onWrite) await this.onWrite();
  }

  async getUser(phone: string): Promise<User | null> {
    return this.db.users.find((user) => user.phone === phone) ?? null;
  }

  async insertUser(user: User): Promise<User> {
    if (this.db.users.some((existing) => existing.phone === user.phone)) {
      throw new Error("That phone number is already registered.");
    }
    this.db.users.push(user);
    await this.touch();
    return user;
  }

  async updateUser(phone: string, patch: Partial<Pick<User, "status">>): Promise<void> {
    const user = this.db.users.find((item) => item.phone === phone);
    if (!user) throw new Error("User not found.");
    if (patch.status) user.status = patch.status;
    await this.touch();
  }

  async saveOtp(otp: Otp): Promise<void> {
    this.db.otps = this.db.otps.filter((item) => item.phone !== otp.phone);
    this.db.otps.push(otp);
    await this.touch();
  }

  async getOtp(phone: string): Promise<Otp | null> {
    return this.db.otps.find((item) => item.phone === phone) ?? null;
  }

  async incrementOtpAttempts(phone: string): Promise<void> {
    const otp = this.db.otps.find((item) => item.phone === phone);
    if (!otp) return;
    otp.attempts += 1;
    await this.touch();
  }

  async deleteOtp(phone: string): Promise<void> {
    this.db.otps = this.db.otps.filter((item) => item.phone !== phone);
    await this.touch();
  }

  async saveSession(session: Session): Promise<void> {
    this.db.sessions = this.db.sessions.filter((item) => item.tokenHash !== session.tokenHash);
    this.db.sessions.push(session);
    await this.touch();
  }

  async getSession(tokenHash: string): Promise<Session | null> {
    return this.db.sessions.find((item) => item.tokenHash === tokenHash) ?? null;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.db.sessions = this.db.sessions.filter((item) => item.tokenHash !== tokenHash);
    await this.touch();
  }

  async insertClaim(claim: Claim): Promise<Claim> {
    this.db.claims.push(claim);
    await this.touch();
    return claim;
  }

  async getClaim(id: string): Promise<Claim | null> {
    return this.db.claims.find((item) => item.id === id) ?? null;
  }

  async updateClaim(
    id: string,
    patch: Partial<Pick<Claim, "status" | "balanceId" | "txHash" | "claimTxHash">>,
  ): Promise<void> {
    const claim = this.db.claims.find((item) => item.id === id);
    if (!claim) throw new Error("Claim not found.");
    Object.assign(claim, patch);
    await this.touch();
  }

  async listClaimsByRecipient(phone: string, status?: ClaimStatus): Promise<Claim[]> {
    return this.db.claims
      .filter((item) => item.recipientPhone === phone && (!status || item.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listClaimsBySender(phone: string): Promise<Claim[]> {
    return this.db.claims
      .filter((item) => item.senderPhone === phone)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addActivity(activity: Activity): Promise<void> {
    this.db.activities.push(activity);
    await this.touch();
  }

  async listActivity(phone: string, limit = 30): Promise<Activity[]> {
    return this.db.activities
      .filter((item) => item.ownerPhone === phone)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async getSponsor(): Promise<Sponsor | null> {
    return this.db.sponsor;
  }

  async saveSponsor(sponsor: Sponsor): Promise<void> {
    this.db.sponsor = sponsor;
    await this.touch();
  }

  async insertCashout(cashout: Cashout): Promise<Cashout> {
    this.db.cashouts.push(cashout);
    await this.touch();
    return cashout;
  }

  async getCashout(id: string): Promise<Cashout | null> {
    return this.db.cashouts.find((item) => item.id === id) ?? null;
  }

  async updateCashout(
    id: string,
    patch: Partial<Pick<Cashout, "anchorTxId" | "status" | "interactiveUrl" | "stellarTxHash" | "detail">>,
  ): Promise<void> {
    const cashout = this.db.cashouts.find((item) => item.id === id);
    if (!cashout) throw new Error("Cash-out not found.");
    Object.assign(cashout, patch);
    await this.touch();
  }

  async listCashouts(phone: string): Promise<Cashout[]> {
    return this.db.cashouts
      .filter((item) => item.phone === phone)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
