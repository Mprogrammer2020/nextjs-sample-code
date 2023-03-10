import Head from "next/head";
import Image from 'next/image';
import { useRouter } from "next/router";
import { useEffect, useState, useCallback } from "react";
import Swal, { SweetAlertResult } from "sweetalert2";
import { config } from "../config/config";
import Loader from "./Loader";
import { Details } from "./Shipment/Details";
import toast from "./Toast"
import { useAppSelector } from "../rtk/hooks";
import { encryptData, jsonObj, numberWithCommas } from "../helpers/validation";
import Milestone from "./Shipment/Milestone";
import moment from "moment";
import ShipmentStatus from "./Shipment/ShipmentStatus";
import { shipmentServices } from "../services/shipment.services";

const OfferDetails = () => {
    const router = useRouter()
    const [loading, setLoading] = useState(false);
    const { id } = router.query
    const [bidData, setBidData] = useState<jsonObj>({})
    const [data, setData] = useState<jsonObj>({})
    const [company, setCompany] = useState<jsonObj>({})
    const [accept, SetAccept] = useState(false)
    const selector = useAppSelector((state) => state.profile.profile_data);

    useEffect(() => {
        setLoading(true)
        if (id) {
            shipmentServices.viewOfferDetails(id).then((offerResponse: jsonObj) => {
                let tempData = offerResponse.data.offersDetails
                if (selector && selector.account_type == 'C') {
                    tempData.frieght_rate = tempData.original_frieght_rate
                } else if (tempData.is_markup_added == '1') {
                    tempData.frieght_rate = String(Number(tempData.original_frieght_rate) + Number(tempData.markup_price))
                }
                setBidData(tempData)
                setCompany(offerResponse.data.companyProfileDetails)
                shipmentServices.shipmentDetails(offerResponse.data.offersDetails.shipment_id).then((response: jsonObj) => {
                    let shipmentDetails = response.data.shipmentDetails
                    if (selector && selector.account_type == 'C' && shipmentDetails.accepted_quotation_id && id != shipmentDetails.accepted_quotation_id) {
                        showForbiddenError()
                    }
                    if (selector && selector.account_type == 'S' && selector.id != shipmentDetails.user_id) {
                        showForbiddenError()
                    }
                    setData(shipmentDetails)
                    setLoading(false)
                }).catch(error => {
                    setLoading(false)
                    if (error.response?.status == 403) {
                        notify("warn", "Forbidden.")
                        router.push("/shipments")
                    }
                })
            }).catch(err => {
                setLoading(false)
                if (err.response?.status == 401) {
                    localStorage.clear()
                    router.push("/login")
                } else {
                    notify("error", "An error occured.")
                }
            })
        }
    }, [id, accept, selector])

    const notify = useCallback((type, message) => {
        toast.dismiss()
        toast({ type, message });
    }, []);

    function showForbiddenError() {
        notify("warn", "Forbidden.")
        router.push("/shipments")
    }

    const transitTime = () => {
        if (bidData.departure_date && bidData.arrival_date) {
            const date1 = new Date(bidData.departure_date) as any
            const date2 = new Date(bidData.arrival_date) as any
            const diffTime = Math.abs(date2 - date1)
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays == 1 || diffDays == 0 ? diffDays + " day" : diffDays + " days"
        }
        return "N / A"
    }

    const shipmentDataInterface = { data: data }

    function totalCharges() {
        let charges = 0
        if (bidData.frieght_rate && bidData.frieghtRateCurrency?.conversion_rate) {
            let freightCharges = (Number(bidData.frieght_rate) * Number(bidData.frieghtRateCurrency?.conversion_rate))
            if (bidData.frieght_rate_tax) {
                freightCharges += (freightCharges * Number(bidData.frieght_rate_tax)) / 100
            }
            charges += Number(freightCharges.toFixed(2))
        }
        if (bidData.origin_port_rate && bidData.originPortRateCurrency?.conversion_rate) {
            let originPortCharges = (Number(bidData.origin_port_rate) * Number(bidData.originPortRateCurrency?.conversion_rate))
            if (bidData.origin_port_rate_tax) {
                originPortCharges += (originPortCharges * Number(bidData.origin_port_rate_tax)) / 100
            }
            charges += Number(originPortCharges.toFixed(2))
        }
        if (bidData.local_truck_rate && bidData.localTruckRateCurrency?.conversion_rate) {
            let localTruckCharges = (Number(bidData.local_truck_rate) * Number(bidData.localTruckRateCurrency?.conversion_rate))
            if (bidData.local_truck_rate_tax) {
                localTruckCharges += (localTruckCharges * Number(bidData.local_truck_rate_tax)) / 100
            }
            charges += Number(localTruckCharges.toFixed(2))
        }
        if (bidData.destination_truck_rate && bidData.destinationTruckRateCurrency?.conversion_rate) {
            let destTruckcharges = (Number(bidData.destination_truck_rate) * Number(bidData.destinationTruckRateCurrency?.conversion_rate))
            if (bidData.destination_truck_rate_tax) {
                destTruckcharges += (destTruckcharges * Number(bidData.destination_truck_rate_tax)) / 100
            }
            charges += Number(destTruckcharges.toFixed(2))
        }
        if (bidData.destination_port_rate && bidData.destinationPortRateCurrency?.conversion_rate) {
            let destPortCharges = (Number(bidData.destination_port_rate) * Number(bidData.destinationPortRateCurrency?.conversion_rate))
            if (bidData.destination_port_rate_tax) {
                destPortCharges += (destPortCharges * Number(bidData.destination_port_rate_tax)) / 100
            }
            charges += Number(destPortCharges.toFixed(2))
        }
        if (data.quantity && Number(data.quantity) > 1) {
            charges = charges * Number(data.quantity)
        }
        return numberWithCommas(charges.toFixed(2))
    }

    function multiplyRate(rate: number | string, conversion: number | string) {
        if (rate && conversion) {
            return Number((Number(rate) * Number(conversion))).toFixed(2)
        } else return "0"
    }

    return (
        <>
            <Head>
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
                />
            </Head>
            <section className="bg-grey py-5 carrier_section1">
                {loading && <Loader />}
                <div className="container">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="info_header">
                                <h2 onClick={() => {
                                    if (data.accepted_quotation_id || data.bid_id) {
                                        router.push("/shipments")
                                    } else {
                                        router.back()
                                    }
                                }}>
                                    <Image src="/images/back_icon.svg" alt="" width={10} height={46} />
                                    <span className="ms-2">Back</span>
                                </h2>
                                {
                                    selector ?
                                        <a style={{ textDecoration: "none" }} href={`${config.apiUrl}/shipments/generatePdf/${data.id}?token=${encryptData(String(selector.id))}`} rel="noreferrer">
                                            <h5 className="c-pointer">
                                                <Image src="/images/export_icon.svg" alt="" width={14} height={14} />
                                                <span className="ms-2">Export</span>
                                            </h5>
                                        </a>
                                        : ""
                                }
                            </div>
                        </div>

                    </div>
                    <div className="row flex_row">
                        <div className={data.accepted_quotation_id ? "col-md-9" : "col-md-12"}>
                            <div className="white_bg pt-2 pb-4 mt-0">
                                <div className="status_header frominput pt-3 pb-2 d-flex">
                                    <div className="milesonte_status_header">
                                        <ShipmentStatus data={data} userProfile={selector} bidStatus={bidData.status} />
                                    </div>
                                    {
                                        data.accepted_quotation_id && (selector?.account_type == 'S' || (selector?.owner_account_type == 'S' && selector?.permissions?.includes("message"))) && (
                                            <div className="form-box ms-3">
                                                <button className="btn message-btn" type="button" onClick={() => {
                                                    let chatData = { other_user: { company: { company_name: company?.company_name, company_picture: company.company_picture } }, tra: data.tra_no, shipment_id: bidData.shipment_id, receiver_id: bidData.user, sender_id: selector.id }
                                                    localStorage.setItem("chatData", JSON.stringify(chatData))
                                                    router.push(`/message?shipment=${window.btoa(bidData.shipment_id)}`)
                                                }}>
                                                    <span className="dark-chat-icon">
                                                        <Image src="/images/dark-chat.svg" alt="" width={21} height={20} />
                                                    </span>
                                                    <span className="ms-2">Message</span>
                                                </button>
                                            </div>
                                        )
                                    }
                                </div>
                                <div className="carrier-information-box mt-3">
                                    <div className="carrier-information-box-header">
                                        <h5>Carrier Information</h5>
                                        {
                                            router.pathname == '/shipments/offer/details/[id]' && (!data.accepted_quotation_id || !data.bid_id) && !loading && bidData.status == '0' && (selector.account_type == 'S' || selector.owner_account_type == 'S')
                                                ?
                                                <div className="d-flex accept_reject_outer">
                                                    <button className="btn accpt_quat" onClick={() => {
                                                        if (selector.admin_verified == '3') {
                                                            toast.dismiss()
                                                            notify("error", "Your account has been suspended. Please contact administrator.")
                                                            return false
                                                        }
                                                        Swal.fire({
                                                            title: "Alert",
                                                            text: "Are you sure you want to accept the request?",
                                                            showConfirmButton: true,
                                                            showCancelButton: true,
                                                            confirmButtonColor: "#f6a931",
                                                            confirmButtonText: "Accept"
                                                        }).then((e: SweetAlertResult<any>) => {
                                                            if (e.isConfirmed) {
                                                                setLoading(true)
                                                                shipmentServices.replyOffer(id, 1).then(resp => {
                                                                    notify("success", "Offer accepted successfully.")
                                                                    SetAccept(true)
                                                                    setLoading(false)
                                                                }).catch(err => {
                                                                    notify("error", "An error occured.")
                                                                    setLoading(false)
                                                                    if (err.response?.status == 401) {
                                                                        router.push("/login")
                                                                    }
                                                                })
                                                            }
                                                        })
                                                    }}
                                                    >
                                                        Accept
                                                    </button>
                                                    <button className="btn rjct_quat" onClick={() => {
                                                        if (selector.admin_verified == '3') {
                                                            toast.dismiss()
                                                            notify("error", "Your account has been suspended. Please contact administrator.")
                                                            return false
                                                        }
                                                        Swal.fire({
                                                            title: "Alert",
                                                            text: "Are you sure you want to reject the request?",
                                                            showConfirmButton: true,
                                                            showCancelButton: true,
                                                            confirmButtonText: "Reject"
                                                        }).then((e: SweetAlertResult<any>) => {
                                                            if (e.isConfirmed) {
                                                                setLoading(true)
                                                                shipmentServices.replyOffer(id, 2).then(resp => {
                                                                    setLoading(false)
                                                                    router.back()
                                                                }).catch(err => {
                                                                    setLoading(false)
                                                                    if (err.response?.status == 401) {
                                                                        router.push("/login")
                                                                    }
                                                                })
                                                            }
                                                        })
                                                    }}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                                : ""
                                        }
                                    </div>
                                    <div className="carrier-information-inner mt-2">
                                        <div className="row">
                                            {
                                                selector?.account_type != 'S' || bidData.status != 0 ?

                                                    <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                        <label>Name</label>
                                                        <p>{company?.company_name}</p>
                                                    </div>

                                                    : ""
                                            }

                                            {
                                                selector?.account_type != 'S' || bidData.status != 0 ?

                                                    <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                        <label>Contact No.</label>
                                                        <p>{company?.company_phone}</p>
                                                    </div>

                                                    : ""
                                            }
                                            {
                                                company?.company_website && bidData.status != 0
                                                    ?
                                                    <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                        <label>Website</label>
                                                        <p className="c-pointer" style={{ overflowWrap: "break-word" }}>
                                                            <a target="_blank" style={{ overflowWrap: "break-word", color: "#F6A931" }} rel="noreferrer" href={company.company_website.startsWith("http") ? company.company_website : `http://${company.company_website}`}>
                                                                {company.company_website}
                                                            </a>
                                                        </p>
                                                    </div>
                                                    : ""
                                            }

                                            {
                                                selector?.account_type != 'S' || bidData.status != 0 ?
                                                    <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                        <label>Company License Number</label>
                                                        <p style={{ lineBreak: "anywhere" }}><u>{company?.company_license_id}</u></p>
                                                    </div>
                                                    : ""
                                            }
                                        </div>

                                        <div className="row justify-content-center">
                                            {
                                                bidData.status != 0 ?
                                                    <>
                                                        {
                                                            company?.company_address
                                                                ?
                                                                <div className="col-xl-4 col-lg-5 col-md-6 col-sm-6 col-12 mb-2">
                                                                    <div className="address_box">
                                                                        <div className="position-relative">
                                                                            <span className="location_img">
                                                                                <Image src="/images/green_pin.svg" width={17} height={21} className="green_img1" />
                                                                            </span>
                                                                            <label>Address 1</label>
                                                                            <p>{company.company_address}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                : ""
                                                        }

                                                        {
                                                            company?.company_address2
                                                                ?
                                                                <div className="col-xl-4 col-lg-5 col-md-6 col-sm-6 col-12 mb-2">
                                                                    <div className="address_box address_box_red">
                                                                        <div className="position-relative">
                                                                            <span className="location_img">
                                                                                <Image src="/images/red_pin.svg" width={17} height={21} className="green_img1" />
                                                                            </span>
                                                                            <label>Address 2</label>
                                                                            <p>{company.company_address2}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                : ""
                                                        }
                                                    </>
                                                    : ""
                                            }
                                            {
                                                selector?.account_type == 'S' && bidData.status == 0 ?
                                                    <p> Carrier information will be revealed after offer is accepted </p>
                                                    : ""
                                            }
                                        </div>
                                    </div>
                                    {
                                        data.mode?.slug != 'land' ?
                                            <>
                                                <div className="carrier-information-box-header mt-4">
                                                    <h5>Sailing Schedule</h5>
                                                </div>
                                                <div className="carrier-information-inner mt-2">
                                                    <div className="row">
                                                        <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                            <label>Shipping Line</label>
                                                            <p>{bidData?.shipping_line ? bidData.shipping_line : "N/A"}</p>
                                                        </div>

                                                        <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                            <label>Vessel Name</label>
                                                            <p>{bidData?.vessle_name ? bidData.vessle_name : "N/A"}</p>
                                                        </div>

                                                        <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                            <label>Departure Date</label>
                                                            <p>{bidData?.departure_date ? moment(new Date(bidData.departure_date)).format("YYYY/MM/DD") : "N / A"}</p>
                                                        </div>

                                                        <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                            <label>Arrival Date</label>
                                                            <p>{bidData?.arrival_date ? moment(new Date(bidData.arrival_date)).format("YYYY/MM/DD") : "N / A"}</p>
                                                        </div>

                                                        <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                            <label>Transit Time</label>
                                                            <p>{transitTime()}</p>
                                                        </div>

                                                        {
                                                            bidData?.originPort?.id ?
                                                                <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                                    <label>Origin Port</label>
                                                                    <p>{bidData?.originPort?.name ? `${bidData.originPort.name} (${bidData.originPort.code})` : "N / A"}</p>
                                                                </div>
                                                                : ""
                                                        }

                                                        {
                                                            bidData?.destinationPort?.id ?
                                                                <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                                    <label>Destination Port</label>
                                                                    <p>{bidData?.destinationPort?.name ? `${bidData.destinationPort.name} (${bidData.destinationPort.code})` : "N / A"}</p>
                                                                </div>
                                                                : ""
                                                        }
                                                    </div>
                                                </div>

                                                <div className="carrier-information-box-header mt-4">
                                                    <h5>Quotation Information</h5>
                                                </div>
                                                <div className="carrier-information-inner mt-2">
                                                    <div className="row">
                                                        <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                            <label>Free Time Origin</label>
                                                            <p>{bidData?.free_time_origin ? bidData.free_time_origin == '1' || bidData.free_time_origin == '0' ? `${bidData.free_time_origin} Day` : `${bidData.free_time_origin} Days` : "N/A"}</p>
                                                        </div>


                                                        <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                            <label>Free Time Destination</label>
                                                            <p>{bidData?.free_time_destination ? bidData.free_time_destination == '1' || bidData.free_time_destination == '0' ? `${bidData.free_time_destination} Day` : `${bidData.free_time_destination} Days` : "N/A"}</p>
                                                        </div>

                                                        <div className="col-lg-3 col-md-6  col-sm-6 col-6 mb-2">
                                                            <label>Transit Time (Days) </label>
                                                            <p>{transitTime()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                            : ""
                                    }

                                    {
                                        bidData?.term_and_conditions && (
                                            <div className="carrier-information-inner">
                                                <div className="row">
                                                    <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                        <label>Term and Conditions</label>
                                                        <div className="mt-1 d-flex">
                                                            <Image src="/images/add-document.svg" width={21} height={27} alt="" />
                                                            <a style={{ color: "#F6A931" }} target="_blank" rel="noreferrer" href={`${config.imageUrl}${bidData.term_and_conditions}`} >View Document</a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }

                                    <div className="carrier-information-box-header mt-4">
                                        <h5>Carrier Charges</h5>
                                    </div>
                                    <div className="carrier-information-inner mt-2">
                                        <div className="row">
                                            {
                                                bidData.frieght_rate && (
                                                    <div className="col-lg-4 col-md-6 col-sm-6 col-6 mb-2">
                                                        <label>Freight Rate Charges Per Unit(All In)</label>
                                                        {
                                                            bidData.frieghtRateCurrency?.is_default == '0' ?
                                                                < p > {numberWithCommas(multiplyRate(bidData.frieght_rate, bidData.frieghtRateCurrency?.conversion_rate))} {bidData.defaultCurrency ? bidData.defaultCurrency : "AED"} ({`${numberWithCommas(bidData.frieght_rate)} ${bidData.frieghtRateCurrency?.code}`}) (Tax - {bidData.frieght_rate_tax}%)</p>
                                                                :
                                                                <p>{numberWithCommas(bidData.frieght_rate)} {bidData.defaultCurrency ? bidData.defaultCurrency : "AED"} (Tax - {bidData.frieght_rate_tax}%)</p>
                                                        }
                                                    </div>
                                                )
                                            }

                                            {
                                                bidData.origin_port_rate && (
                                                    <div className="col-lg-4 col-md-6 col-sm-6 col-6 mb-2">
                                                        <label>Origin Port Charges Per Unit </label>
                                                        {
                                                            bidData.originPortRateCurrency?.is_default == '0'
                                                                ?
                                                                <p>{numberWithCommas(multiplyRate(bidData.origin_port_rate, bidData.originPortRateCurrency?.conversion_rate))} {bidData.defaultCurrency ? bidData.defaultCurrency : "AED"} ({`${numberWithCommas(bidData.origin_port_rate)} ${bidData.originPortRateCurrency?.code}`}) (Tax - {bidData.origin_port_rate_tax}%)</p>
                                                                :
                                                                <p>{numberWithCommas(bidData.origin_port_rate)} {bidData.defaultCurrency ? bidData.defaultCurrency : "AED"} (Tax - {bidData.origin_port_rate_tax}%)</p>
                                                        }
                                                    </div>
                                                )
                                            }

                                            {
                                                bidData.destination_port_rate && (
                                                    <div className="col-lg-4 col-md-6 col-sm-6 col-6 mb-2">
                                                        <label>Destination Port Charges Per Unit</label>
                                                        {
                                                            bidData.destinationPortRateCurrency?.is_default == '0'
                                                                ?
                                                                <p>{numberWithCommas(multiplyRate(bidData.destination_port_rate, bidData.destinationPortRateCurrency?.conversion_rate))} {bidData.defaultCurrency ? bidData.defaultCurrency : "AED"} ({`${numberWithCommas(bidData.destination_port_rate)} ${bidData.destinationPortRateCurrency?.code}`}) (Tax - {bidData.destination_port_rate_tax}%)</p>
                                                                :
                                                                <p>{numberWithCommas(bidData.destination_port_rate)} {bidData.defaultCurrency ? bidData.defaultCurrency : "AED"} (Tax - {bidData.destination_port_rate_tax}%)</p>
                                                        }
                                                    </div>

                                                )
                                            }

                                            {
                                                bidData.local_truck_rate && (
                                                    <div className="col-lg-4 col-md-6 col-sm-6 col-6 mb-2">
                                                        <label>Origin Locals Charges Per Unit</label>
                                                        {
                                                            bidData.localTruckRateCurrency?.is_default == '0'
                                                                ?

                                                                <p>{numberWithCommas(multiplyRate(bidData.local_truck_rate, bidData.localTruckRateCurrency?.conversion_rate))} {bidData.defaultCurrency ? bidData.defaultCurrency : "AED"} ({`${numberWithCommas(bidData.local_truck_rate)} ${bidData.localTruckRateCurrency?.code}`}) (Tax - {bidData.local_truck_rate_tax}%)</p>
                                                                :
                                                                <p>{numberWithCommas(bidData.local_truck_rate)} {bidData.defaultCurrency ? bidData.defaultCurrency : "AED"} (Tax - {bidData.local_truck_rate_tax}%)</p>
                                                        }
                                                    </div>
                                                )
                                            }

                                            {
                                                bidData.destination_truck_rate && (
                                                    <div className="col-lg-4 col-md-6 col-sm-6 col-6 mb-2">
                                                        <label>Destination Locals Charges Per Unit </label>
                                                        {
                                                            bidData.destinationTruckRateCurrency?.is_default == '0'
                                                                ?
                                                                <p>{numberWithCommas(multiplyRate(bidData.destination_truck_rate, bidData.destinationTruckRateCurrency?.conversion_rate))} {bidData.defaultCurrency ? bidData.defaultCurrency : "AED"} ({`${numberWithCommas(bidData.destination_truck_rate)} ${bidData.destinationTruckRateCurrency?.code}`}) (Tax - {bidData.destination_truck_rate_tax}%)</p>
                                                                :
                                                                <p>{numberWithCommas(bidData.destination_truck_rate)} {bidData.defaultCurrency ? bidData.defaultCurrency : "AED"} (Tax - {bidData.destination_truck_rate_tax}%)</p>
                                                        }
                                                    </div>

                                                )
                                            }

                                            <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                <label>Total Freight Charges</label>
                                                <p style={{ color: "#F6A931" }}>
                                                    {totalCharges()} {bidData.defaultCurrency ? bidData.defaultCurrency : "AED"}

                                                </p>
                                            </div>
                                        </div>
                                        <div className="row">
                                            <div className="hr_line"></div>
                                            <div className="col-md-12 mt-3">
                                                <label>Terms and Conditions</label>
                                                <p style={{ overflowWrap: "break-word" }}>{bidData.additional_comments ? bidData.additional_comments : "N/A"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="py-4 ps-4">
                                <h5 className="mb-0"> {router.pathname == '/shipments/offer/details/[id]' ? "My" : ""} Shipment Details</h5>
                            </div>
                            {
                                Object.keys(data).length ? (
                                    <Details {...shipmentDataInterface} />
                                ) : ""
                            }
                        </div>
                        {
                            data.accepted_quotation_id && data.milestones
                                ?
                                <Milestone selector={selector} reloadTemp={SetAccept} data={data} offerData={bidData} accountType={selector?.owner_account_type ? selector?.owner_account_type : selector?.account_type} loading={setLoading} />
                                :
                                ""
                        }
                    </div>
                </div>
            </section>
        </>
    )
}
export default OfferDetails;