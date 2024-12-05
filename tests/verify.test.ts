import { proofTypes, curveTypes, libraries } from './common/utils';
import { runAllProofTests, runAllVKRegistrationTests } from "./common/runners";

jest.setTimeout(300000);
//TODO uncomment tests
describe('zkVerify proof user journey tests', () => {
    test('should verify all proof types and respond on finalization without waiting for Attestation event', async () => {
        await runAllProofTests(proofTypes, curveTypes, libraries, false);
    });

    // test('should verify all proof types, wait for Attestation event, and then check proof of existence', async () => {
    //     await runAllProofTests(proofTypes, curveTypes, true);
    // });
    //
    // test('should register VK and verify the proof using the VK hash for all proof types', async () => {
    //     await runAllVKRegistrationTests(proofTypes, curveTypes);
    // });
});
