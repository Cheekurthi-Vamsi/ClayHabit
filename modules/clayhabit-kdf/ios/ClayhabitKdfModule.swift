import CommonCrypto
import ExpoModulesCore

/// PBKDF2-HMAC-SHA256 via CommonCrypto; see the Android module for why it's native.
public class ClayhabitKdfModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ClayhabitKdf")

    AsyncFunction("pbkdf2Sha256") { (password: String, salt: Data, iterations: Int, keyLength: Int) throws -> Data in
      guard (1...10_000_000).contains(iterations), (16...64).contains(keyLength) else {
        throw Exception(name: "InvalidArguments", description: "iterations or keyLength out of range")
      }
      var derived = Data(count: keyLength)
      let passwordBytes = Array(password.utf8)
      let status = derived.withUnsafeMutableBytes { derivedBytes in
        salt.withUnsafeBytes { saltBytes in
          CCKeyDerivationPBKDF(
            CCPBKDFAlgorithm(kCCPBKDF2),
            passwordBytes.map { Int8(bitPattern: $0) }, passwordBytes.count,
            saltBytes.bindMemory(to: UInt8.self).baseAddress, salt.count,
            CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), UInt32(iterations),
            derivedBytes.bindMemory(to: UInt8.self).baseAddress, keyLength)
        }
      }
      guard status == kCCSuccess else {
        throw Exception(name: "DerivationFailed", description: "PBKDF2 failed with status \(status)")
      }
      return derived
    }
  }
}
