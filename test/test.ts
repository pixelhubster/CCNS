import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs"
import { expect } from "chai"
import hre from "hardhat"
import { BigNumber } from "ethers"

describe("CCNS", function () {
    async function deploy() {
        const ccipLocalSimulatorFactory = await hre.ethers.getContractFactory("CCIPLocalSimulator");
        const ccipLocalSimulator = await ccipLocalSimulatorFactory.deploy()
        const [,alice] = await hre.ethers.getSigners()
        const config: {
            chainSelector_: BigNumber,
            sourceRouter_: string,
            destinationRouter_: string,
            wrappedNative_: string,
            linkToken_: string,
            ccipBnM_: string,
            ccipLnM_: string
        } = await ccipLocalSimulator.configuration();

        // Instance of CrossChainNameServiceLookup.sol on Receiver
        const ccnsLookupFactory = await hre.ethers.getContractFactory("CrossChainNameServiceLookup");
        const ccnsLookup = await ccnsLookupFactory.deploy();
        console.log("CCNSLookup Address (receiver): ", ccnsLookup.address)
        
        // Instance of CrossChainNameServiceLookup.sol on Source
        const ccnsLookupSourceFactory = await hre.ethers.getContractFactory("CrossChainNameServiceLookup");
        const ccnsLookupSource = await ccnsLookupSourceFactory.deploy();
        console.log("CCNSLookup Address (source): ", ccnsLookupSource.address)
        
        // Instance of CrossChainNameServiceRegister.sol
        const crossChainNameServiceRegisterFactory = await hre.ethers.getContractFactory("CrossChainNameServiceRegister");
        const crossChainNameServiceRegister = await crossChainNameServiceRegisterFactory.deploy(config.sourceRouter_, ccnsLookupSource.address)
        console.log("CCNSRegister Address: ", crossChainNameServiceRegister.address)
        
        // Instance of CrossChainNameServiceReceiver.sol
        const crossChainNameServiceReceiverFactory = await hre.ethers.getContractFactory("CrossChainNameServiceReceiver");
        const crossChainNameServiceReceiver = await crossChainNameServiceReceiverFactory.deploy(config.destinationRouter_, ccnsLookup.address, config.chainSelector_);
        console.log("CCNSReceiver Address: ", crossChainNameServiceReceiver.address)
        

        // calling the enableChain()
        await crossChainNameServiceRegister.enableChain(config.chainSelector_, crossChainNameServiceReceiver.address, 200_000n);
        
        // await ccipLocalSimulator.requestLinkFromFaucet(crossChainNameServiceRegister.address, 5_000_000_000_000_000_000n);
        return { ccipLocalSimulator, ccnsLookup, ccnsLookupSource, crossChainNameServiceReceiver, crossChainNameServiceRegister, alice }

    }

    describe("Deploying", async function () {
        it("Should Register alice.ccns and assert its owner", async function () {
            const { alice, ccnsLookup, ccnsLookupSource, crossChainNameServiceReceiver, crossChainNameServiceRegister } = await loadFixture(deploy)
            await ccnsLookupSource.setCrossChainNameServiceAddress(crossChainNameServiceRegister.address);
            await ccnsLookup.setCrossChainNameServiceAddress(crossChainNameServiceReceiver.address);
            
            await crossChainNameServiceRegister.connect(alice).register("alice.ccns")

            expect(await ccnsLookup.lookup("alice.ccns")).to.equal(alice.address)
        })
        // it("Should Register alice.ccns and assert its owner", async function () {
        //     const { alice, crossChainNameServiceRegister, ccnsLookupSource } = await loadFixture(deploy);
        // })

    })
})