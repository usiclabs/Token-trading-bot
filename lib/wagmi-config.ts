import { http, createConfig } from "wagmi"
import { base } from "wagmi/chains"
import { injected, coinbaseWallet } from "wagmi/connectors"

const BASE_RPC_URL = "https://base-mainnet.blastapi.io/d6d4ab7c-d1de-4412-9a48-ae9c7965285c"

export const config = createConfig({
  chains: [base],
  connectors: [injected(), coinbaseWallet({ appName: "Base Trading Bot" })],
  transports: {
    [base.id]: http(BASE_RPC_URL),
  },
})
