import { ApiPromise } from "@polkadot/api";

export const decodeDispatchError = (api: ApiPromise, dispatchError: any): string => {
    if (dispatchError.isModule) {
        const decoded = api.registry.findMetaError(dispatchError.asModule);
        const { docs, name, section } = decoded;
        return `${section}.${name}: ${docs.join(' ')}`;
    } else {
        return dispatchError.toString();
    }
};