import { NftAuctionProgramContext } from "../contexts/useNftAuctionProgram"

import { useMemo } from "react"
import * as anchor from "@project-serum/anchor"
import { Keypair, PublicKey } from "@solana/web3.js"
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { IDL} from "../constants/idl/types/nft_auction"
import { NFT_AUCTION_PROGRAM } from "../constants"
import { MyWallet } from "../utils"

// eslint-disable-next-line react/prop-types
export const NftAuctionProgramProvider = ({ children }) => {

    const programId = useMemo(() => new PublicKey(NFT_AUCTION_PROGRAM), []) ;

    const wallet = useAnchorWallet()
    const { connection } = useConnection()

    const provider = useMemo(() => {
        if (wallet)
            return new anchor.AnchorProvider(connection, wallet, { commitment: "processed" })
        return new anchor.AnchorProvider(connection, new MyWallet(Keypair.generate()), { commitment: "processed" })
    }, [connection, wallet]);

    const program = useMemo(() => {
        if (provider)
            return new anchor.Program(IDL, programId, provider)
        return null
    }, [programId, provider])

    return <NftAuctionProgramContext.Provider value={program}>
        {children}
    </NftAuctionProgramContext.Provider>
}