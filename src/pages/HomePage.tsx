import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { Button, Col, InputNumber, Modal, notification, Spin } from "antd"
import { useCallback, useEffect, useState } from "react"
import { useMetaplex } from "../contexts/useMetaplex"
import { useNftAuctionProgram } from "../contexts/useNftAuctionProgram"
import { BN } from "@project-serum/anchor"
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import { getAssociatedTokenAddressSync, getAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token"
import moment from "moment"
import NftCard from "../components/NftCard"
import { SELLER_ADDRESS } from "../constants"
import Masonry from 'react-masonry-css';
import './style.scss';

type TimeNumber = {
    deadLine: number;
  };

function StartTime({ deadLine }: TimeNumber) {

    const [days, setDays] = useState(0);
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);

    const [isIn, setIsIn] = useState(false);
    useEffect(() => {
        const myInterval = setInterval(() => {
            const currentDate = Date.now() / 1000;

            if (currentDate > deadLine){
                const diff = currentDate - deadLine;

                const dayNum = diff > 0 ? Math.floor(diff / 60 / 60 / 24) : 0;
                const hourNum = diff > 0 ? Math.floor(diff / 60 / 60) % 24 : 0;
                const minNum = diff > 0 ? Math.floor(diff / 60) % 60 : 0;
          
                setDays(dayNum);
                setHours(hourNum);
                setMinutes(minNum);
                setIsIn(false)
            }else{
                const diff = deadLine - currentDate;

                const dayNum = diff > 0 ? Math.floor(diff / 60 / 60 / 24) : 0;
                const hourNum = diff > 0 ? Math.floor(diff / 60 / 60) % 24 : 0;
                const minNum = diff > 0 ? Math.floor(diff / 60) % 60 : 0;
          
                setDays(dayNum);
                setHours(hourNum);
                setMinutes(minNum);
                
                setIsIn(true)
            }
            
          }, 100);
          return () => {
            clearInterval(myInterval);
          };
    }, [deadLine])
    
    return (
        <div className="row-div">
            <p>Start TIme :</p>
            {isIn ? 
            <p>in <span>{days !== 0 && `${days} days `} {hours !== 0 && `${hours} hrs `} {minutes !== 0 && `${minutes} mins`}</span></p>:
            <p><span>{days !== 0 && `${days} days `} {hours !== 0 && `${hours} hrs `} {minutes !== 0 && `${minutes} mins`}</span> ago</p>}
        </div>
    );
  }
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
                <p>Finished</p>:
                <p> in <span>{days !== 0 && `${days} days `} {hours !== 0 && `${hours} hrs `} {minutes !== 0 && `${minutes} mins`}</span></p>
            }
        </div>
    );
  }

export default function HomePage() {
    const { connection } = useConnection()
    const { metaplex } = useMetaplex()
    const wallet = useAnchorWallet()


    const { program: nftAuctonProgram, globalStatePubkey, globalState, vaultAccountPubkey, fetchState } = useNftAuctionProgram()

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

    const [price, setPrice] = useState<number | null>(null);


    const [auctionState, setAuctionState] = useState<{ pubKey: PublicKey, mint: PublicKey, winner: PublicKey, price: BN, state: number, start_time: number }>()

    const onCloseModal = () => {
        setAuctionState(undefined)
        setPrice(null)
    }

    const onBid = useCallback(async () => {
        if (!nftAuctonProgram || !auctionState || !wallet || !price || !globalStatePubkey) return

        if (price <= auctionState.price.toNumber() / LAMPORTS_PER_SOL) {
            notification.open({
                message: "Price should be great than current Price",
                type: "warning"
            })
            return;
        }

        const builder = nftAuctonProgram.methods.bidNft(new BN(price * LAMPORTS_PER_SOL)).accounts({ globalState: globalStatePubkey, auctionState: auctionState.pubKey, mint: auctionState.mint, originWinner: auctionState.winner, payer: wallet.publicKey, vaultAccount: vaultAccountPubkey })

        const buyerNftAccountAddress = getAssociatedTokenAddressSync(auctionState.mint, wallet.publicKey)
        try {
            await getAccount(connection, buyerNftAccountAddress)
        } catch (e) {
            const instruction = createAssociatedTokenAccountInstruction(wallet.publicKey, buyerNftAccountAddress, wallet.publicKey, auctionState.mint)
            builder.preInstructions([instruction])
        }
        const transaction = await builder.transaction()
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.feePayer = wallet.publicKey
        const txId = await connection.sendRawTransaction((await wallet.signTransaction(transaction)).serialize())
        await connection.confirmTransaction(txId)
        notification.open({
            type: "success",
            message: <div>Success with txId: <a target="_blank" href={`https://solscan.io/tx/${txId}`} rel="noreferrer">{txId}</a></div>
        })
        fetchState()
        onCloseModal()
    }, [auctionState, connection, fetchState, globalStatePubkey, nftAuctonProgram, price, vaultAccountPubkey, wallet])

    const onSaleNft = useCallback(async (auctionState: { pubKey: PublicKey, mint: PublicKey, winner: PublicKey, price: BN, state: number, start_time: number }) => {
        if (nftAuctonProgram && wallet && metaplex && globalState && vaultAccountPubkey) {
            const sellerAccountInfo = await metaplex.tokens().findTokenWithMintByMint({ address: new PublicKey(SELLER_ADDRESS), addressType: "owner", mint: auctionState.mint })

            const buyerNftAccountAddress = getAssociatedTokenAddressSync(auctionState.mint, auctionState.winner)
            const transaction = await nftAuctonProgram.methods.saleNft().accounts({
                auctionState: auctionState.pubKey,
                mint: auctionState.mint,
                payer: new PublicKey(SELLER_ADDRESS),
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
    // console.log(auctionStatus.filter(nft=> moment.unix(nft.start_time).add(1, "day").isBefore() && (nft.price.toNumber() / LAMPORTS_PER_SOL !== 0)))
    
    if (globalState && globalState.count > 0) {
        return <div className="container mx-auto text-center home">
           
            <div className="content">
                <div className="title">
                    <h2>Auction</h2>
                </div>
                {auctionStatus.filter(nft=> moment.unix(nft.start_time).add(1, "day").isBefore() && (nft.price.toNumber() / LAMPORTS_PER_SOL !== 0)).length > 0 ?
                <>
                    <Masonry
                        breakpointCols={breakpointColumnsObj}
                        className="masonry"
                        columnClassName="gridColumn"
                    >
                        {auctionStatus.map(auctionState => {
                            const endTime = moment.unix(auctionState.start_time).add(1, "day")
                            const isMyWin = auctionState.winner.toBase58() === wallet?.publicKey.toBase58()
                            return auctionState.price.toNumber() / LAMPORTS_PER_SOL !== 0 &&
                            <Col span={24} key={auctionState.pubKey.toBase58()} className = 'product'>
                                <NftCard nft={auctionState.mint} />
                                
                                <div className="state-div">
                                    <h4>Auction Status</h4>
                                    <StartTime deadLine={auctionState.start_time}/>
                                    <EndTime deadLine={auctionState.start_time + 86400}/>

                                    <div className="row-div">
                                        <p>Last Price :</p>
                                        <p>{auctionState.price.toNumber() / LAMPORTS_PER_SOL} SOL</p>
                                    </div>
                                    {(endTime.isBefore() ? 
                                        (isMyWin ?
                                            <Button 
                                                type="primary" 
                                                disabled={auctionState.state !== 2} 
                                                onClick={() => onSaleNft(auctionState)}
                                            >Claim NFT</Button>:
                                            <Button>Ended</Button>
                                        ): 
                                        (isMyWin ? 
                                            <Button type="primary" disabled>Already Bid</Button> : 
                                            <Button type="primary" onClick={() => setAuctionState(auctionState)}>Bid Now</Button>
                                        )
                                    )}

                                </div>
                            </Col>
                        })}
                    </Masonry>

                </>:
                
                <>
                    <h1 className="mt-20">
                        There is not Listed Nft for Auctions
                    </h1>
                </>

                }
                
                <Modal open={!!auctionState} onCancel={onCloseModal} title="Bid to NFT" destroyOnClose footer={null}>
                    <NftCard nft={auctionState?.mint} />
                    <div className="flex items-center justify-around mt-4 gap-4">
                        <InputNumber min={(auctionState?.price.toNumber() ?? 0) / LAMPORTS_PER_SOL} value={price} onChange={(v) => setPrice(v)} addonAfter="SOL" />
                        {wallet ? <Button type="primary" onClick={onBid}>Bid</Button> : <WalletMultiButton />}

                    </div>
                </Modal>
            </div>
        </div>
    }





    return <div className="container content mx-auto mt-20 text-center">
        <h1 className="mb-4">
            Awaiting NFT to be Listed For Auction
        </h1>
        <Spin />
    </div>
}