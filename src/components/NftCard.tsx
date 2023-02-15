import { JsonMetadata, Metadata, Nft, NftWithToken, Sft, SftWithToken } from "@metaplex-foundation/js";
import { PublicKey } from "@solana/web3.js";
import { Card, Spin } from "antd";
import { useEffect, useState } from "react";
import { useMetaplex } from "../contexts/useMetaplex";

export default function NftCard({ nft, action, actionTile }: { nft?: Metadata<JsonMetadata<string>> | Nft | Sft | PublicKey, action?: () => void, actionTile?: string }) {
    const { metaplex } = useMetaplex()
    const [nftDetail, setNftDetail] = useState<Sft | SftWithToken | Nft | NftWithToken>()
    useEffect(() => {
        if (!metaplex) return;
        if (!nft) return;
        if (nft instanceof PublicKey) {
            metaplex.nfts().findByMint({ mintAddress: new PublicKey(nft) }).then(setNftDetail)
            return;
        }
        if (nft.model === "metadata") {
            metaplex.nfts().load({ metadata: nft }).then(setNftDetail)
        }
    }, [metaplex, nft])

    if (!nft) {
        return null
    }

    const nftInfo = nftDetail
    if (!nftInfo) {
        return <Card>
            <Spin />
        </Card>
    }

    return <Card key={nftInfo.address.toBase58()} cover={
    <div className="relative h-0 w-full" style={{ paddingTop: '100%',minHeight : 200 }}>
        <img alt="image" src={nftInfo.json?.image} loading="lazy" style={{}} className="absolute left-0 top-0 w-full h-full" />
    </div>}>

        <Card.Meta title={nftInfo.json?.name} description={nftInfo.json?.symbol} />
        <div onClick={() => {
            action && action()
        }}>{actionTile}</div>
    </Card>

}