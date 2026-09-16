import axios from "axios";
import crypto from "crypto";

export async function initPowertranzSpiSale({
    merchantId,
    merchantPassword,
    amount,
    orderId,
    currency,
    email,
    name,
    card,
}: {
    merchantId: string;
    merchantPassword: string;
    amount: number;
    orderId: string;
    currency: string;
    email?: string;
    name?: string;
    card: {
        pan: string;
        cvv: string;
        expiry: string;
    };
}) {
    const payload = {
        TransactionIdentifier: crypto.randomUUID(),
        OrderIdentifier: orderId,
        TotalAmount: Math.round(amount * 100),
        CurrencyCode: currency === "USD" ? "840" : "356",
        ThreeDSecure: true,

        Source: {
            CardPan: card.pan,
            CardCvv: card.cvv,
            CardExpiration: card.expiry,
            CardholderName: name || "Guest",
        },

        AddressMatch: false,

        ExtendedData: {
            ThreeDSecure: {
                ChallengeWindowSize: 4,
                ChallengeIndicator: "01",
            },
            MerchantResponseUrl:
                `${process.env.BASE_URL}/api/payments/powertranz/3ds-response`,
        },
    };

    console.log("payload:- ", payload);

    const { data } = await axios.post(
        "https://staging.ptranz.com/api/spi/sale",
        payload,
        {
            headers: {
                "PowerTranz-PowerTranzId": merchantId,
                "PowerTranz-PowerTranzPassword": merchantPassword,
            },
        }
    );

    console.log("data:- ", data);

    if (data.IsoResponseCode !== "SP4") {
        throw new Error(data.ResponseMessage || "PowerTranz SPI init failed");
    }

    return {
        redirectData: data.RedirectData,
        spiToken: data.SpiToken,
    };
}
