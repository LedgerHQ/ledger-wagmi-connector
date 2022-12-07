import {
  loadConnectKit,
  LedgerConnectKit,
  SupportedProviders,
  EthereumProvider,
} from '@ledgerhq/connect-kit-loader';
import { providers } from 'ethers';
import { getAddress } from 'ethers/lib/utils';
import {
  Connector,
  normalizeChainId,
  ProviderRpcError,
  UserRejectedRequestError,
  Chain,
  RpcError,
  ConnectorData,
} from '@wagmi/core';
import { getDebugLogger, getErrorLogger, enableDebugLogs } from './lib/logger';

const log = getDebugLogger('LWC');
const logError = getErrorLogger('LWC');

type LedgerConnectorOptions = {
  chainId?: number;
  bridge?: string;
  infuraId?: string;
  rpc?: { [chainId: number]: string };

  enableDebugLogs?: boolean;
};

type LedgerSigner = providers.JsonRpcSigner;

export class LedgerConnector extends Connector<
  EthereumProvider,
  LedgerConnectorOptions,
  LedgerSigner
> {
  readonly id = 'ledger';
  readonly name = 'Ledger';
  readonly ready = true;

  private connectKitPromise: Promise<LedgerConnectKit>;
  private provider?: EthereumProvider;

  constructor({
    chains,
    options = { enableDebugLogs: false },
  }: {
    chains?: Chain[];
    options?: LedgerConnectorOptions;
  } = {}) {
    super({ chains, options });

    if (options.enableDebugLogs) {
      enableDebugLogs();
    }

    log('constructor');
    log('chains are', chains);
    log('options are', options);

    this.connectKitPromise = loadConnectKit();
  }

  async connect(): Promise<
    Required<ConnectorData>
  > {
    log('connect');

    try {
      log('getting Connect Kit');
      const connectKit = await this.connectKitPromise;

      if (this.options.enableDebugLogs) {
        connectKit.enableDebugLogs();
      }

      log('checking Connect support');
      connectKit.checkSupport({
        providerType: SupportedProviders.Ethereum,
        chainId: this.options.chainId,
        infuraId: this.options.infuraId,
        rpc: this.options.rpc,
      });

      const provider = await this.getProvider({ forceCreate: true });

      if (provider.on) {
        log('assigning event handlers');
        provider.on('accountsChanged', this.onAccountsChanged);
        provider.on('chainChanged', this.onChainChanged);
        provider.on('disconnect', this.onDisconnect);
      }

      this.emit('message', { type: 'connecting' });

      const account = await this.getAccount();
      const id = await this.getChainId();
      const unsupported = this.isChainUnsupported(id);
      log('unsupported is', unsupported);

      return {
        account,
        chain: { id, unsupported },
        provider: new providers.Web3Provider(
          provider as providers.ExternalProvider
        ),
      };
    } catch (error) {
      if ((error as ProviderRpcError).code === 4001) {
        logError('user rejected', error);
        throw new UserRejectedRequestError(error);
      }
      if ((error as RpcError).code === -32002) {
        logError('RPC error -32002, Resource unavailable', error);
        throw error instanceof Error ? error : new Error(String(error));
      }

      logError('error in connect', error);
      throw error;
    }
  }

  async disconnect() {
    log('disconnect');

    const provider = await this.getProvider();

    if (!!provider?.disconnect) {
      log('disconnecting provider');
      await provider.disconnect();
    }

    if (provider?.removeListener) {
      log('removing event handlers');
      provider.removeListener('accountsChanged', this.onAccountsChanged);
      provider.removeListener('chainChanged', this.onChainChanged);
      provider.removeListener('disconnect', this.onDisconnect);
    }
  }

  async getAccount() {
    log('getAccount');

    const provider = await this.getProvider();
    const accounts = (await provider.request({
      method: 'eth_requestAccounts',
    })) as string[];
    const account = getAddress(accounts[0] as string);
    log('account is', account);

    return account;
  }

  async getChainId() {
    log('getChainId');

    const provider = await this.getProvider();
    const chainId = (await provider.request({
      method: 'eth_chainId',
    })) as number;
    log('chainId is', chainId, normalizeChainId(chainId));

    return normalizeChainId(chainId);
  }

  async getProvider(
    { forceCreate }: { chainId?: number; forceCreate?: boolean } = {
      forceCreate: false,
    },
  ) {
    log('getProvider');

    if (!this.provider || forceCreate) {
      log('getting provider from Connect Kit');
      const connectKit = await this.connectKitPromise;
      this.provider = (await connectKit.getProvider()) as EthereumProvider;
      log('provider is', this.provider);
    }
    return this.provider;
  }

  async getSigner() {
    log('getSigner');

    const [provider, account] = await Promise.all([
      this.getProvider(),
      this.getAccount(),
    ]);
    return new providers.Web3Provider(
      provider as providers.ExternalProvider
    ).getSigner(account);
  }

  async isAuthorized() {
    log('isAuthorized');

    try {
      const provider = await this.getProvider();
      const accounts = (await provider.request({
        method: 'eth_accounts',
      })) as string[];
      const account = accounts[0];
      log('account', account);

      return !!account;
    } catch {
      return false;
    }
  }

  protected onAccountsChanged = (accounts: string[]) => {
    log('onAccountsChanged');

    if (accounts.length === 0) this.emit('disconnect');
    else this.emit('change', { account: getAddress(accounts[0] as string) });
  };

  protected onChainChanged = (chainId: number | string) => {
    log('onChainChanged');

    const id = normalizeChainId(chainId);
    const unsupported = this.isChainUnsupported(id);
    this.emit('change', { chain: { id, unsupported } });
  };

  protected onDisconnect = () => {
    log('onDisconnect');
  };
}
