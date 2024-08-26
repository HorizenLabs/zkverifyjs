import { ApiPromise, WsProvider } from '@polkadot/api';
import { closeSession } from './index';
import { jest, describe, beforeEach, it, expect, afterEach } from '@jest/globals';

describe('closeSession', () => {
    let api: jest.Mocked<ApiPromise>;
    let provider: jest.Mocked<WsProvider>;

    beforeEach(() => {
        api = {
            disconnect: jest.fn().mockResolvedValue(undefined as never),
            isConnected: true,
        } as unknown as jest.Mocked<ApiPromise>;

        provider = {
            disconnect: jest.fn().mockResolvedValue(undefined as never),
            isConnected: true,
        } as unknown as jest.Mocked<WsProvider>;

        Object.defineProperty(api, 'isConnected', {
            get: jest.fn(),
        });

        Object.defineProperty(provider, 'isConnected', {
            get: jest.fn(),
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const setupSpies = () => {
        const apiDisconnectSpy = jest.spyOn(api, 'disconnect') as jest.SpiedFunction<ApiPromise['disconnect']>;
        const providerDisconnectSpy = jest.spyOn(provider, 'disconnect') as jest.SpiedFunction<WsProvider['disconnect']>;
        return { apiDisconnectSpy, providerDisconnectSpy };
    };

    it('should disconnect both API and provider successfully', async () => {
        jest.spyOn(api, 'isConnected', 'get')
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false);

        jest.spyOn(provider, 'isConnected', 'get')
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false);

        const { apiDisconnectSpy, providerDisconnectSpy } = setupSpies();

        await closeSession(api, provider);

        expect(apiDisconnectSpy).toHaveBeenCalledTimes(1);
        expect(providerDisconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('should not call provider.disconnect if provider is already disconnected', async () => {
        jest.spyOn(api, 'isConnected', 'get').mockReturnValue(false);
        jest.spyOn(provider, 'isConnected', 'get').mockReturnValue(false);

        const { apiDisconnectSpy, providerDisconnectSpy } = setupSpies();

        await closeSession(api, provider);

        expect(apiDisconnectSpy).toHaveBeenCalledTimes(0);
        expect(providerDisconnectSpy).toHaveBeenCalledTimes(0);
    });

    it('should retry API disconnect if it remains connected initially', async () => {
        const { apiDisconnectSpy, providerDisconnectSpy } = setupSpies();

        jest.spyOn(api, 'isConnected', 'get')
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false);

        jest.spyOn(provider, 'isConnected', 'get').mockReturnValue(false);

        await closeSession(api, provider);

        expect(apiDisconnectSpy).toHaveBeenCalledTimes(3);
        expect(providerDisconnectSpy).toHaveBeenCalledTimes(0);
    });

    it('should throw an error if API fails to disconnect after 5 retries', async () => {
        jest.spyOn(api, 'isConnected', 'get').mockReturnValue(true);
        const { apiDisconnectSpy } = setupSpies();

        await expect(closeSession(api, provider)).rejects.toThrowError(
            'Failed to disconnect API after 5 attempts.'
        );

        expect(apiDisconnectSpy).toHaveBeenCalledTimes(5);
    });

    it('should throw an error if provider fails to disconnect after 5 retries', async () => {
        jest.spyOn(api, 'isConnected', 'get').mockReturnValue(false);
        jest.spyOn(provider, 'isConnected', 'get').mockReturnValue(true);
        const { providerDisconnectSpy } = setupSpies();

        await expect(closeSession(api, provider)).rejects.toThrowError(
            'Failed to disconnect Provider after 5 attempts.'
        );

        expect(providerDisconnectSpy).toHaveBeenCalledTimes(5);
    });

    it('should throw an error specifying which part failed if both API and provider fail to disconnect', async () => {
        jest.spyOn(api, 'isConnected', 'get').mockReturnValue(true);
        jest.spyOn(provider, 'isConnected', 'get').mockReturnValue(true);

        const { apiDisconnectSpy, providerDisconnectSpy } = setupSpies();

        await expect(closeSession(api, provider)).rejects.toThrowError(
            'Failed to disconnect API after 5 attempts. and Failed to disconnect Provider after 5 attempts.'
        );

        expect(apiDisconnectSpy).toHaveBeenCalledTimes(5);
        expect(providerDisconnectSpy).toHaveBeenCalledTimes(5);
    });

    it('should throw an error only for the component that fails to disconnect', async () => {
        jest.spyOn(api, 'isConnected', 'get')
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false);

        jest.spyOn(provider, 'isConnected', 'get').mockReturnValue(true);

        const { apiDisconnectSpy, providerDisconnectSpy } = setupSpies();

        await expect(closeSession(api, provider)).rejects.toThrowError(
            'Failed to disconnect Provider after 5 attempts.'
        );

        expect(apiDisconnectSpy).toHaveBeenCalledTimes(1);
        expect(providerDisconnectSpy).toHaveBeenCalledTimes(5);
    });

    it('should disconnect provider after 3 retries if it remains connected initially', async () => {
        const { providerDisconnectSpy } = setupSpies();

        jest.spyOn(provider, 'isConnected', 'get')
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false);

        jest.spyOn(api, 'isConnected', 'get').mockReturnValue(false);

        await closeSession(api, provider);

        expect(providerDisconnectSpy).toHaveBeenCalledTimes(3);
    });
});
