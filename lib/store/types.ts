import type { AssetCode } from "../money";

export type UserStatus = "active" | "pending" | "funding";
export type ClaimStatus = "open" | "claimed" | "reclaimed";
export type Direction = "in" | "out";
export type CashoutProvider = "airtel" | "mtn";

export type User = {
  phone: string;
  publicKey: string;
  encryptedSecret: string;
  status: UserStatus;
  createdAt: string;
};

export type Otp = {
  phone: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
};

export type Session = {
  tokenHash: string;
  phone: string;
  expiresAt: string;
};

export type Claim = {
  id: string;
  senderPhone: string;
  recipientPhone: string;
  asset: AssetCode;
  amount: string;
  balanceId: string | null;
  recipientPublicKey: string;
  encryptedRecipientSecret: string;
  status: ClaimStatus;
  txHash: string | null;
  claimTxHash: string | null;
  createdAt: string;
  expiresAt: string;
};

export type Activity = {
  id: string;
  ownerPhone: string;
  kind: string;
  title: string;
  asset: AssetCode;
  amount: string;
  direction: Direction;
  counterparty: string | null;
  txHash: string | null;
  claimId: string | null;
  createdAt: string;
};

export type Sponsor = {
  publicKey: string;
  encryptedSecret: string;
};

export type Cashout = {
  id: string;
  phone: string;
  asset: AssetCode;
  amount: string;
  provider: CashoutProvider;
  anchorTxId: string | null;
  status: string;
  interactiveUrl: string | null;
  stellarTxHash: string | null;
  detail: string | null;
  createdAt: string;
};

export type Database = {
  users: User[];
  otps: Otp[];
  sessions: Session[];
  claims: Claim[];
  activities: Activity[];
  sponsor: Sponsor | null;
  cashouts: Cashout[];
};

export function emptyDatabase(): Database {
  return {
    users: [],
    otps: [],
    sessions: [],
    claims: [],
    activities: [],
    sponsor: null,
    cashouts: [],
  };
}

export interface Store {
  getUser(phone: string): Promise<User | null>;
  insertUser(user: User): Promise<User>;
  updateUser(phone: string, patch: Partial<Pick<User, "status">>): Promise<void>;
  saveOtp(otp: Otp): Promise<void>;
  getOtp(phone: string): Promise<Otp | null>;
  incrementOtpAttempts(phone: string): Promise<void>;
  deleteOtp(phone: string): Promise<void>;
  saveSession(session: Session): Promise<void>;
  getSession(tokenHash: string): Promise<Session | null>;
  deleteSession(tokenHash: string): Promise<void>;
  insertClaim(claim: Claim): Promise<Claim>;
  getClaim(id: string): Promise<Claim | null>;
  updateClaim(id: string, patch: Partial<Pick<Claim, "status" | "balanceId" | "txHash" | "claimTxHash">>): Promise<void>;
  listClaimsByRecipient(phone: string, status?: ClaimStatus): Promise<Claim[]>;
  listClaimsBySender(phone: string): Promise<Claim[]>;
  addActivity(activity: Activity): Promise<void>;
  listActivity(phone: string, limit?: number): Promise<Activity[]>;
  getSponsor(): Promise<Sponsor | null>;
  saveSponsor(sponsor: Sponsor): Promise<void>;
  insertCashout(cashout: Cashout): Promise<Cashout>;
  getCashout(id: string): Promise<Cashout | null>;
  updateCashout(
    id: string,
    patch: Partial<Pick<Cashout, "anchorTxId" | "status" | "interactiveUrl" | "stellarTxHash" | "detail">>,
  ): Promise<void>;
  listCashouts(phone: string): Promise<Cashout[]>;
}
