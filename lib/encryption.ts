

import CryptoJS from 'crypto-js';

export class EncryptionService {
  private static secretKey: string | null = null;

  static setMasterPassword(masterPassword: string | null) {
    this.secretKey = masterPassword;
  }

  static encrypt(data: string): string {
    if (!this.secretKey) {
      throw new Error("Master password not set for encryption.");
    }
    return CryptoJS.AES.encrypt(data, this.secretKey).toString();
  }

  static decrypt(encryptedData: string): string {
    if (!this.secretKey) {
      throw new Error("Master password not set for decryption.");
    }
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  static hashPassword(password: string): string {
    return CryptoJS.SHA256(password).toString();
  }

  // A dummy method to satisfy the original design, can be expanded later.
  static generateSalt(): string {
      return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }

  static initialize() {
    // This can be used for more complex initialization logic in the future
  }
}