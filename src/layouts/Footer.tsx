import './style.scss'

export default function Footer() {
  return (
    <div className='footer'>
        <div className="footer_content">
            <h1>Custodios</h1>
            <a href="#header" className='logo'>
                <img src="/assets/crypto-bez-tla.png" alt="" />
            </a>
            <div className="links">
                <a href="https://discord.gg/qmzEYBNCRq" target={'_blank'} rel="noreferrer">
                    <i className="fab fa-discord"></i>
                </a>
                <a href="https://twitter.com/Custodios_nft" target={'_blank'} rel="noreferrer">
                    <i className="fab fa-twitter"></i>
                </a>
            </div>
        </div>
        
      
    </div>
  )
}
