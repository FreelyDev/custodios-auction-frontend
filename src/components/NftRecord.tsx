import { JsonMetadata, Metadata, Nft, NftWithToken, Sft, SftWithToken } from "@metaplex-foundation/js";
import { Avatar, Card } from "antd";
import { useEffect, useState } from "react";
import { useMetaplex } from "../contexts/useMetaplex";

export default function NftRecord({ nft, action, actionTile }: { nft?: Metadata<JsonMetadata<string>> | Nft | Sft, action?: () => void, actionTile?: string }) {
    const { metaplex } = useMetaplex()
    const [nftDetail, setNftDetail] = useState<Sft | SftWithToken | Nft | NftWithToken>()
    useEffect(() => {
        if (!metaplex) return;
        if (!nft) return;
        if (nft.model === "metadata") {
            metaplex.nfts().load({ metadata: nft }).then(setNftDetail)
        }
    }, [metaplex, nft])

    if(!nft) {
        return null
    }

    const nftInfo = nftDetail || nft

    return <Card key={nftInfo.address.toBase58()}>
        <Card.Meta title={nftInfo.json?.name} description={nftInfo.json?.symbol} avatar={<Avatar src={nftInfo.json?.image} />}/>
        <div onClick={() => {
            action && action()
        }}>{actionTile}</div>
    </Card>

}