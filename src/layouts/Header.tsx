import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Space } from "antd";
import './style.scss';
export default function Header() {
    return <Space align="center" className="p-2 w-full bg-slate-900 justify-between topbar">
        <div className="header" id = 'header'>
            <a href="https://custodios.io/" target={'_blank'} rel="noreferrer">
                <div className = "logo">
                    <img src="/assets/crypto-bez-tla.png" alt="" />
                    <h1>Custodios Auction</h1>
                </div>
            </a>
            
            
            <div className="ml-auto" style={{width: "max-content"}}>
                <WalletMultiButton />
            </div>

        </div>
    </Space>
}