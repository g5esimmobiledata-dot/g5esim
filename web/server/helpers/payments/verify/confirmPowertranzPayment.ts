import axios from "axios";

export async function confirmPowertranzPayment({
    spiToken,
}: {
    spiToken: string;
}) {
    const { data } = await axios.post(
        "https://staging.ptranz.com/api/spi/payment",
        `"${spiToken}"`,
        {
            headers: { "Content-Type": "application/json" },
        }
    );

    if (data.Approved && data.IsoResponseCode === "00") {
        // await markOrderPaid(data.OrderIdentifier);
        return {
            success: true,
            orderId: data.OrderIdentifier,
            authorizationCode: data.AuthorizationCode,
            rrn: data.RRN,
        };
    }

    return {
        success: false,
        message: data.ResponseMessage || "Payment failed",
    };
}
