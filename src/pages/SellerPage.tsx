import { useCallback, useEffect, useMemo, useState } from "react"
import { useNftAuctionProgram } from "../contexts/useNftAuctionProgram"
import * as anchor from "@project-serum/anchor"
import { BN } from "@project-serum/anchor"
import { LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js"
import { Button, Col, Drawer, notification } from "antd"
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { useMetaplex } from "../contexts/useMetaplex"
import { JsonMetadata, Metadata } from "@metaplex-foundation/js"
import NftCard from "../components/NftCard"
import { createApproveCheckedInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token"
import NftRecord from "../components/NftRecord"
import Masonry from 'react-masonry-css';
import './style.scss';
import moment from "moment"

type TimeNumber = {
    deadLine: number;
};

function EndTime({ deadLine }: TimeNumber) {

    const [days, setDays] = useState(0);
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);
    useEffect(() => {
        const myInterval = setInterval(() => {
            const currentDate = Date.now() / 1000;
            const diff = deadLine - currentDate;
            const dayNum = diff > 0 ? Math.floor(diff / 60 / 60 / 24) : 0;
            const hourNum = diff > 0 ? Math.floor(diff / 60 / 60) % 24 : 0;
            const minNum = diff > 0 ? Math.floor(diff / 60) % 60 : 0;

            setDays(dayNum);
            setHours(hourNum);
            setMinutes(minNum);
        }, 100);
        return () => {
            clearInterval(myInterval);
        };
    }, [deadLine])

    return (
        <div className="row-div">
            <p>End TIme :</p>
            {days === 0 && hours === 0 && minutes === 0 ?
                <p>Finished</p> :
                <p> in <span>{days !== 0 && `${days} days : `} {hours !== 0 && `${hours} hours : `} {minutes !== 0 && `${minutes} mins`}</span></p>
            }
        </div>
    );
}

export default function SellerPage() {
    const { program: nftAuctonProgram, globalStatePubkey, globalState, vaultAccountPubkey, fetchState } = useNftAuctionProgram()

    const wallet = useAnchorWallet()
    const { connection } = useConnection()

    const [auctionStatus, setAuctionStatus] = useState<{ pubKey: PublicKey, mint: PublicKey, winner: PublicKey, price: BN, state: number, start_time: number }[]>([])

    useEffect(() => {
        fetchState()
    }, [fetchState])

    useEffect(() => {
        if (!globalState) return
        if (!nftAuctonProgram) return
        if (globalState.count > 0) {
            nftAuctonProgram.account.auctionState.all().then(states => {
                setAuctionStatus(states.map((state) => {
                    return {
                        pubKey: state.publicKey,
                        mint: state.account.mint,
                        winner: state.account.winner,
                        price: state.account.price,
                        state: state.account.state,
                        start_time: state.account.startTime
                    }
                }))
            })
        }

    }, [globalState, nftAuctonProgram])

    const onInit = useCallback(async () => {
        if (nftAuctonProgram && wallet) {
            const transaction = await nftAuctonProgram.methods.initialize().accounts({
                authority: wallet.publicKey,
                globalState: globalStatePubkey,
            }).transaction()
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            transaction.feePayer = wallet.publicKey
            const txId = await connection.sendRawTransaction((await wallet.signTransaction(transaction)).serialize())
            await connection.confirmTransaction(txId)
            fetchState()
        }


    }, [connection, fetchState, globalStatePubkey, nftAuctonProgram, wallet])

    const { metaplex } = useMetaplex()


    const [onListing, setOnListing] = useState(false);

    const [nfts, setNfts] = useState<Metadata[]>([])
    const [lists, setLists] = useState<Record<string, boolean>>({})
    const [updateLists, setUpdateLists] = useState<Record<string, boolean>>({})
    const listNfts = useMemo(() => {
        return Object.entries(lists).map(([key, value]) => value && key).filter(v => v !== false) as string[]
    }, [lists])

    const updateNfts = useMemo(() => {
        return Object.entries(updateLists).map(([key, value]) => value && key).filter(v => v !== false) as string[]
    }, [updateLists])

    const [showListDrawer, setShowListDrawer] = useState(false)
    useEffect(() => {
        if (!metaplex || !wallet) return
        metaplex.nfts().findAllByOwner({ owner: wallet.publicKey }).then(nfts => {
            const collectionNfts = nfts.filter(nft => {
                if (nft.model === "metadata") {
                    return nft.name === "cust"
                }
                // return true
            }) as Metadata<JsonMetadata<string>>[]
            setNfts(collectionNfts)
        })

    }, [metaplex, wallet])


    const onUpdteLists = useCallback(async () => {

        if (nftAuctonProgram && wallet && metaplex) {
            try {
                setOnListing(true)
                const mintAddresses = nfts.filter(v => updateLists[v.address.toBase58()]).map(v => v.mintAddress)

                const [vaultAccountPubkey] = PublicKey.findProgramAddressSync(
                    [anchor.utils.bytes.utf8.encode("vault")],
                    nftAuctonProgram.programId
                );

                const transaction = new Transaction();

                await Promise.all(mintAddresses.map(async (mintAddress) => {
                    const sellerAccountInfo = await metaplex.tokens().findTokenWithMintByMint({ address: wallet.publicKey, addressType: "owner", mint: mintAddress })
                    const [auctionStatePubkey] = PublicKey.findProgramAddressSync(
                        [anchor.utils.bytes.utf8.encode("auction"), mintAddress.toBytes()],
                        nftAuctonProgram.programId
                    );
                    const txBuilder = nftAuctonProgram.methods.updateList().accounts({
                        mint: mintAddress,
                        payer: wallet.publicKey,
                        globalState: globalStatePubkey,
                        auctionState: auctionStatePubkey,
                        vaultAccount: vaultAccountPubkey,
                        payerNftAccount: sellerAccountInfo.address,
                    })

                    if (!sellerAccountInfo.delegateAddress?.equals(vaultAccountPubkey) || !sellerAccountInfo.delegateAmount.basisPoints.eq(new BN(1))) {
                        const approveInstruction = createApproveCheckedInstruction(sellerAccountInfo.address, mintAddress, vaultAccountPubkey, wallet.publicKey, 1, 0)
                        // const transaction = new Transaction().add(approveInstruction)
                        // transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                        // transaction.feePayer = wallet.publicKey
                        // const txId = await connection.sendRawTransaction((await wallet.signTransaction(transaction)).serialize())
                        // await connection.confirmTransaction(txId)    
                        transaction.add(approveInstruction);
                        // txBuilder.preInstructions([approveInstruction])
                    }
                    transaction.add(await txBuilder.instruction())
                }))
                transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                transaction.feePayer = wallet.publicKey
                const txId = await connection.sendRawTransaction((await wallet.signTransaction(transaction)).serialize())
                await connection.confirmTransaction(txId)
                fetchState()
                notification.open({
                    message: <div>Success Update List Nfts at Transaction <a target="_blank" rel="noreferrer" href={`https://solscan.io/tx/${txId}`}>{txId}</a></div>,
                    type: "success"
                })
                setUpdateLists({})

            } catch (error) {
                console.error(error);
                notification.open({
                    message: "Errror",
                    type: "error"
                })
            } finally {
                setOnListing(false)
            }

        }
    }, [connection, fetchState, globalStatePubkey, metaplex, nftAuctonProgram, nfts, updateLists, wallet])

    const onListNfts = useCallback(async () => {

        if (nftAuctonProgram && wallet && metaplex) {
            try {
                setOnListing(true)
                const mintAddresses = nfts.filter(v => lists[v.address.toBase58()]).map(v => v.mintAddress)

                const [vaultAccountPubkey] = PublicKey.findProgramAddressSync(
                    [anchor.utils.bytes.utf8.encode("vault")],
                    nftAuctonProgram.programId
                );

                const transaction = new Transaction();

                await Promise.all(mintAddresses.map(async (mintAddress) => {
                    const sellerAccountInfo = await metaplex.tokens().findTokenWithMintByMint({ address: wallet.publicKey, addressType: "owner", mint: mintAddress })
                    const [auctionStatePubkey] = PublicKey.findProgramAddressSync(
                        [anchor.utils.bytes.utf8.encode("auction"), mintAddress.toBytes()],
                        nftAuctonProgram.programId
                    );
                    const txBuilder = nftAuctonProgram.methods.listNft(new BN(0)).accounts({
                        mint: mintAddress,
                        payer: wallet.publicKey,
                        globalState: globalStatePubkey,
                        auctionState: auctionStatePubkey,
                        vaultAccount: vaultAccountPubkey,
                        payerNftAccount: sellerAccountInfo.address,
                    })

                    if (!sellerAccountInfo.delegateAddress?.equals(vaultAccountPubkey) || !sellerAccountInfo.delegateAmount.basisPoints.eq(new BN(1))) {
                        const approveInstruction = createApproveCheckedInstruction(sellerAccountInfo.address, mintAddress, vaultAccountPubkey, wallet.publicKey, 1, 0)
                        // const transaction = new Transaction().add(approveInstruction)
                        // transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                        // transaction.feePayer = wallet.publicKey
                        // const txId = await connection.sendRawTransaction((await wallet.signTransaction(transaction)).serialize())
                        // await connection.confirmTransaction(txId)    
                        transaction.add(approveInstruction);
                        // txBuilder.preInstructions([approveInstruction])
                    }
                    transaction.add(await txBuilder.instruction())
                }))
                transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                transaction.feePayer = wallet.publicKey
                const txId = await connection.sendRawTransaction((await wallet.signTransaction(transaction)).serialize())
                await connection.confirmTransaction(txId)
                fetchState()
                notification.open({
                    message: <div>Success List Nfts at Transaction <a target="_blank" rel="noreferrer" href={`https://solscan.io/tx/${txId}`}>{txId}</a></div>,
                    type: "success"
                })
                setLists({})

            } catch (error) {
                console.error(error);
                notification.open({
                    message: "Errror",
                    type: "error"
                })
            } finally {
                setOnListing(false)
            }

        }
    }, [connection, fetchState, globalStatePubkey, lists, metaplex, nftAuctonProgram, nfts, wallet])

    const onClear = () => {
        // setShowListDrawer(false)
        setLists({})
    }

    const onClearUpdate = () => {
        // setShowUpdateDrawer(false)
        setUpdateLists({})
    }
    const onSaleNft = useCallback(async (auctionState: { pubKey: PublicKey, mint: PublicKey, winner: PublicKey, price: BN, state: number, start_time: number }) => {
        if (nftAuctonProgram && wallet && metaplex && globalState && vaultAccountPubkey) {
            const sellerAccountInfo = await metaplex.tokens().findTokenWithMintByMint({ address: wallet.publicKey, addressType: "owner", mint: auctionState.mint })


            const buyerNftAccountAddress = getAssociatedTokenAddressSync(auctionState.mint, auctionState.winner)
            const transaction = await nftAuctonProgram.methods.saleNft().accounts({
                auctionState: auctionState.pubKey,
                mint: auctionState.mint,
                payer: wallet.publicKey,
                payerNftAccount: sellerAccountInfo.address,
                vaultAccount: vaultAccountPubkey,
                winner: auctionState.winner,
                winnerNftAccount: buyerNftAccountAddress
            }).transaction()

            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            transaction.feePayer = wallet.publicKey
            const txId = await connection.sendRawTransaction((await wallet.signTransaction(transaction)).serialize())
            await connection.confirmTransaction(txId, "confirmed")
            fetchState()
            notification.open({
                type: "success",
                message: "Saled NFT"
            })

        }
    }, [connection, fetchState, globalState, metaplex, nftAuctonProgram, vaultAccountPubkey, wallet])

    const breakpointColumnsObj = {
        default: 4,
        1440: 4,
        1280: 4,
        1014: 3,
        768: 2,
        450: 1,
    };


    if (!globalState) {
        return <div className="container content mx-auto">
            <h1 className="text-center">CustodiosNFT Auction Program</h1>
            <div className="text-center mt-4">
                <Button type="primary" size="large" onClick={onInit}>Init</Button>
            </div>

        </div>
    }

    return <div className="container mx-auto">
        <div className="content">
            <div className="title">
                <h2>Auction</h2>
            </div>
            <Masonry
                breakpointCols={breakpointColumnsObj}
                className="masonry"
                columnClassName="gridColumn"
            >

                {nfts.map((nft) => {
                    const auctionState = auctionStatus.find(s => s.mint.equals(nft.mintAddress))
                    return <Col span={24} key={nft.address.toBase58()} className={`product ${listNfts.some(v => (v === nft.address.toBase58())) || updateNfts.some(v => (v === nft.address.toBase58()))? 'selected' : ''}`}>
                        <NftCard nft={nft} />

                        {auctionState ?
                            <div className="state-div">
                                <EndTime deadLine={auctionState.start_time + 86400} />

                                <div className="row-div">
                                    <p>Current Price:</p>
                                    <p>{auctionState.price.toNumber() / LAMPORTS_PER_SOL} SOL</p>
                                </div>
                                {auctionState.price.gt(new BN(0)) && auctionState.state === 2 ?
                                    <Button block danger type="primary" onClick={() => onSaleNft(auctionState)}>Sale</Button> :
                                    (moment.unix(auctionState.start_time).add(1, "day").isBefore() ? 
                                        
                                        <Button block style={{background : '#c09d2f' , color : '#000'}}
                                            onClick={() => {
                                                setShowListDrawer(true)

                                                setUpdateLists({ ...updateLists, [nft.address.toBase58()]: !updateLists[nft.address.toBase58()] })
                                            }}
                                        >
                                            {updateNfts.some(v => (v === nft.address.toBase58())) ? 'Remove From Update LIst' : 'Add To Update list'}
                                        </Button>:
                                        <Button block >Listed</Button>
                                    )
                                }
                            </div> :
                            <div className="state-div">
                                <div className="row-div hidden"><p>.</p><p>.</p></div>
                                <div className="row-div hidden"><p>.</p><p>.</p></div>
                                <Button
                                    type="primary"
                                    block
                                    disabled={listNfts.length > 5 && !listNfts.some(v => (v === nft.address.toBase58()))}
                                    onClick={() => {
                                        setShowListDrawer(true)

                                        setLists({ ...lists, [nft.address.toBase58()]: !lists[nft.address.toBase58()] })
                                    }}
                                >
                                    {listNfts.some(v => (v === nft.address.toBase58())) ? 'Remove From List' : 'Add To Lists'}
                                </Button>
                            </div>

                        }


                    </Col>
                })}
            </Masonry>
        </div>



        <Drawer open={showListDrawer && (updateNfts.length > 0 || listNfts.length > 0)} footer={null} onClose={() => setShowListDrawer(false)} title={"List NFTs"} mask={false}>
            <div className="relative flex flex-col justify-between gap-4">
                <div className="overflow-x-auto max-h-96 rounded-md border-2 p-1 border-gray-500 border-solid" style={{ minHeight: '50px' }}>
                    {listNfts.map((address) => <NftRecord key={address} nft={nfts.find(nft => nft.address.toBase58() === address)} />)}
                </div>
                <div className="flex justify-between btns-div">
                    <Button type="primary" onClick={onListNfts}>Start Auction</Button>
                    <Button onClick={onClear}>Clear Selection</Button>
                </div>
            </div>

            <div className="ant-drawer-title">Update NFTs List</div>

            <div className="relative flex flex-col justify-between gap-4">
                <div className="overflow-x-auto max-h-96 rounded-md border-2 p-1 border-gray-500 border-solid" style={{ minHeight: '50px' }}>
                    {updateNfts.map((address) => <NftRecord key={address} nft={nfts.find(nft => nft.address.toBase58() === address)} />)}
                </div>
                <div className="flex justify-between btns-div">
                    <Button type="primary" onClick={onUpdteLists}>Auction again</Button>
                    <Button onClick={onClearUpdate}>Clear Selection</Button>
                </div>
            </div>
        </Drawer>
    </div>


}