import { BN, Program } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { NftAuction } from "../constants/idl/types/nft_auction"

export const NftAuctionProgramContext = createContext<Program<NftAuction> | null>(null)

export function useNftAuctionProgram() {
    const program = useContext(NftAuctionProgramContext)

    const [globalState, setAuctionState] = useState<{ owner: PublicKey, count: number, startTime: number, lastStartTime: number } | null>(null)

    const globalStatePubkey = useMemo(() => {
        if (program?.programId) {
            const [globalStatePubkey] = PublicKey.findProgramAddressSync([], program?.programId)
            return globalStatePubkey
        }
    }, [program?.programId])

    const vaultAccountPubkey = useMemo(() => {
        if (program)
            return PublicKey.findProgramAddressSync(
                [anchor.utils.bytes.utf8.encode("vault")],
                program?.programId
            )[0];
    }, [program])

    const fetchState = useCallback(() => {
        if (!globalStatePubkey) return;
        program?.account.globalState.fetch(globalStatePubkey).then(({ owner, count, startTime, lastStartTime }) => {
            setAuctionState({ owner, count, startTime, lastStartTime })
        }).catch((e) => {
            console.error(e?.message)
        })
    }, [globalStatePubkey, program?.account.globalState])

    return { program, globalStatePubkey, globalState, vaultAccountPubkey, fetchState }

}