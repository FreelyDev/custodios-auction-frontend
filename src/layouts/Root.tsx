import { useWallet } from "@solana/wallet-adapter-react";
import { Space } from "antd";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import { SELLER_ADDRESS } from "../constants";
import HomePage from "../pages/HomePage";
import SellerPage from "../pages/SellerPage";
import Footer from "./Footer";
import Header from "./Header";
import './style.scss';
function Layout() {
  return (
    <div style={{backgroundColor: '#1b1a17'}} className="main-container text-white">
      <Space
        className=""
        direction="vertical"
        style={{ width: "100%" }}
        size={[0, 48]}
      >
        <Header />
        <Outlet />
        <Footer/>
      </Space>
    </div>
  );
}

export default function Root() {
  const { wallet } = useWallet();

  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      children: [
        {
          path: "/",
          element: <HomePage />,
        },
      ],
    },
  ]);

  const adminRouter = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      children: [
        {
          path: "/",
          element: <SellerPage />,
        },
      ],
    },
  ]);

  if (wallet?.adapter?.publicKey?.toBase58() === SELLER_ADDRESS) {
    return <RouterProvider router={adminRouter} />;
  }
  return <RouterProvider router={router} />;
}
