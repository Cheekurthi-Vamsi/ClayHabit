package expo.modules.clayhabitkdf

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/**
 * PBKDF2-HMAC-SHA256 from the platform's own crypto provider. Key stretching
 * has to be slow on purpose (hundreds of thousands of rounds), which is far too
 * slow in JavaScript on a phone and takes well under a second natively.
 */
class ClayhabitKdfModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ClayhabitKdf")

    AsyncFunction("pbkdf2Sha256") { password: String, salt: ByteArray, iterations: Int, keyLength: Int ->
      require(iterations in 1..10_000_000) { "iterations out of range" }
      require(keyLength in 16..64) { "keyLength out of range" }
      val chars = password.toCharArray()
      val spec = PBEKeySpec(chars, salt, iterations, keyLength * 8)
      try {
        SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
      } finally {
        spec.clearPassword()
        chars.fill('\u0000')
      }
    }
  }
}
