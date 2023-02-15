import { keypairIdentity, Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { Keypair } from "@solana/web3.js"
import { useMemo } from "react"
import { MetaplexContext } from "../contexts/useMetaplex"

// eslint-disable-next-line react/prop-types
export const MetaplexProvider = ({ children }) => {
    const { connection } = useConnection()
    const wallet = useWallet()

    const metaplex = useMemo(
        () => {
            if (wallet)
                return Metaplex.make(connection).use(walletAdapterIdentity(wallet))
            return Metaplex.make(connection).use(keypairIdentity(Keypair.generate()))
        },
        [connection, wallet]
    )

    return <MetaplexContext.Provider value={{ metaplex }}>
        {children}
    </MetaplexContext.Provider>
}