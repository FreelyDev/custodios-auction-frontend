import React, { useMemo, useState } from 'react';
import logo from './logo.svg';
import 'antd/dist/reset.css';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { MetaplexProvider } from './providers/MetaplexProvider';
import Root from './layouts/Root';
import { NftAuctionProgramProvider } from './providers/NftAuctionProgramProvider';
import { ConfigProvider, theme } from 'antd';

function App() {

  const [network, setNetwork] = useState(WalletAdapterNetwork.Mainnet);

  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network })
  ], [network])


  return (
    <div className="App">
      <ConnectionProvider endpoint={"https://solana-mainnet.phantom.app/YBPpkkN4g91xDiAnTE9r0RcMkjg0sKUIWvAfoFVJ"}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <MetaplexProvider>
              <NftAuctionProgramProvider>
                <ConfigProvider
                  theme={{
                    algorithm: theme.darkAlgorithm,
                  }}
                >
                  <Root />
                </ConfigProvider>
              </NftAuctionProgramProvider>
            </MetaplexProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  );
}

export default App;
