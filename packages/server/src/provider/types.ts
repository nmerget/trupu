export interface VerifiedIdentity {
  repository: string;
  workflow: string;
  ref: string;
}

export interface Provider {
  verifyToken(token: string): Promise<VerifiedIdentity>;
}
