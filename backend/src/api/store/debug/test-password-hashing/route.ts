import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/debug/test-password-hashing
 * Test whether updateAuthIdentities properly hashes passwords
 * 
 * This endpoint creates a test user, updates password via updateAuthIdentities,
 * and attempts to authenticate to see if hashing is working correctly.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const testEmail = `test-${Date.now()}@password-test.com`;
  const initialPassword = "InitialPass123";
  const updatedPassword = "UpdatedPass456";

  try {
    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

    console.log("\n=== PASSWORD HASHING TEST ===");
    console.log(`Test email: ${testEmail}`);

    // Step 1: Create initial auth identity using register (known to hash correctly)
    console.log("\n1. Creating auth identity with register()...");
    const registerResult = await authModuleService.register("emailpass", {
      body: {
        email: testEmail,
        password: initialPassword
      }
    } as any) as any;

    if (!registerResult?.success || !registerResult?.authIdentity) {
      throw new Error("Failed to create test auth identity");
    }

    const authIdentityId = registerResult.authIdentity.id;
    console.log(`✓ Created auth identity: ${authIdentityId}`);

    // Step 2: Verify initial password works (baseline test)
    console.log("\n2. Testing authentication with initial password...");
    const initialAuthTest = await authModuleService.authenticate("emailpass", {
      body: {
        email: testEmail,
        password: initialPassword
      }
    } as any) as any;

    console.log(`✓ Initial auth test: ${initialAuthTest?.success ? "SUCCESS" : "FAILED"}`);

    // Step 3: Update password using updateAuthIdentities
    console.log("\n3. Updating password via updateAuthIdentities()...");
    await authModuleService.updateAuthIdentities({
      id: authIdentityId,
      provider_metadata: {
        password: updatedPassword
      }
    } as any);

    console.log("✓ Password updated via updateAuthIdentities");

    // Step 4: Test if old password still works (should NOT work)
    console.log("\n4. Testing authentication with OLD password (should fail)...");
    try {
      const oldPasswordTest = await authModuleService.authenticate("emailpass", {
        body: {
          email: testEmail,
          password: initialPassword
        }
      } as any) as any;

      console.log(`Old password test: ${oldPasswordTest?.success ? "STILL WORKS (BAD!)" : "Failed (Good!)"}`);
    } catch (error) {
      console.log("✓ Old password correctly rejected");
    }

    // Step 5: Test if new password works (CRITICAL TEST)
    console.log("\n5. Testing authentication with NEW password (CRITICAL TEST)...");
    const newPasswordTest = await authModuleService.authenticate("emailpass", {
      body: {
        email: testEmail,
        password: updatedPassword
      }
    } as any) as any;

    const passwordHashingWorks = newPasswordTest?.success;
    console.log(`New password test: ${passwordHashingWorks ? "SUCCESS ✓" : "FAILED ✗"}`);

    // Step 6: Retrieve auth identity to inspect provider_metadata
    console.log("\n6. Inspecting provider_metadata...");
    const authIdentity = await authModuleService.retrieveAuthIdentity(authIdentityId) as any;
    
    const providerMetadata = authIdentity.provider_metadata || {};
    const storedPassword = providerMetadata.password || providerMetadata.passwordHash || "N/A";
    
    console.log("Provider metadata keys:", Object.keys(providerMetadata));
    console.log("Stored password value:", storedPassword);
    
    const looksHashed = storedPassword.startsWith("$2") || storedPassword.length > 50;
    console.log(`Password appears hashed: ${looksHashed ? "YES ✓" : "NO ✗ (SECURITY ISSUE!)"}`);

    // Cleanup: Delete test auth identity
    console.log("\n7. Cleaning up test auth identity...");
    await authModuleService.deleteAuthIdentities(authIdentityId);
    console.log("✓ Test auth identity deleted");

    // Generate report
    console.log("\n=== TEST RESULTS ===");
    const testPassed = passwordHashingWorks && looksHashed;

    res.status(200).json({
      test: "Password Hashing Verification",
      result: testPassed ? "PASS" : "FAIL",
      critical_security_issue: !testPassed,
      details: {
        method_tested: "authModuleService.updateAuthIdentities with provider_metadata.password",
        authentication_with_new_password: passwordHashingWorks ? "SUCCESS" : "FAILED",
        password_appears_hashed: looksHashed,
        stored_password_sample: storedPassword.substring(0, 20) + "...",
        recommendation: testPassed 
          ? "✓ updateAuthIdentities properly hashes passwords - safe to use"
          : "✗ updateAuthIdentities does NOT hash passwords - must use delete/recreate pattern"
      },
      test_email: testEmail
    });

    if (!testPassed) {
      console.log("\n⚠️  CRITICAL SECURITY ISSUE DETECTED!");
      console.log("updateAuthIdentities does NOT properly hash passwords!");
      console.log("MUST use delete/recreate pattern with register() instead!");
    } else {
      console.log("\n✓ All tests passed - updateAuthIdentities is safe to use");
    }

  } catch (error) {
    console.error("\n✗ Test failed with error:", error);
    res.status(500).json({
      test: "Password Hashing Verification",
      result: "ERROR",
      error: error.message,
      stack: error.stack
    });
  }
}

