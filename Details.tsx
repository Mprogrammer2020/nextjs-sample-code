import Image from "next/image"
import moment from "moment-timezone"
import { config } from "../../config/config"
import { jsonObj, numberWithCommas } from "../../helpers/validation"

interface shipmentData {
    data: jsonObj
}

export const Details = ({ data }: shipmentData) => {

    return (
        <div className="row">
            <div className="col-xl-12 col-lg-12">
                <div className="carrier-information-box">
                    <div className="carrier-information-box-header">
                        <h5>{data.tra_no}</h5>
                    </div>
                    <div className="carrier-information-inner mt-2">
                        <div className="row">
                            <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                <label>Mode</label>
                                <p>{data.mode?.name}</p>
                            </div>
                            <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                <label>Shipment</label>
                                <p>{data.shipShipmentType?.name}</p>
                            </div>
                            <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                <label>Movement</label>
                                <p>{data.movementType?.name}</p>
                            </div>
                            {
                                data.flow && data.shipShipmentType?.slug == 'port'
                                    ?
                                    <div className='col-xl-3 col-md-6 col-sm-6 mb-2'>
                                        <div>
                                            <label>Flow</label>
                                            <p>{data.flow == 'I' ? "Import" : "Export"}</p>
                                        </div>
                                    </div>
                                    : ""
                            }
                            {
                                data.mode?.slug == 'ocean' ? 
                                <>
                                        {
                                            data.free_time_origin ? (
                                                <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                    <label>Free Time Origin</label>
                                                    <p>{data.free_time_origin} {data.free_time_origin == '1' ? "Day" : "Days"}</p>
                                                </div>
                                            ) : ""
                                        }
                                        {
                                            data.free_time_destination ? (
                                                <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                                    <label>Free Time Destination</label>
                                                    <p>{data.free_time_destination} {data.free_time_destination == '1' ? "Day" : "Days"}</p>
                                                </div>
                                            ) : ""
                                        }
                                </>
                                : ""
                            }
                            {
                                data.containerType != 0 && data.containerType ? (
                                    <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                        <label>Container Type</label>
                                        <p>{data.containerType?.name}</p>
                                    </div>
                                ) : ""
                            }

                            {
                                data.truckType != 0 && data.truckType
                                    ?
                                    <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                        <label>Truck Type</label>
                                        <p>{data.truckType?.name}</p>
                                    </div>
                                    : ""
                            }

                            <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                <label>Commodity</label>
                                <p>{data.commodity}</p>
                            </div>
                            <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                <label>Added On</label>
                                <p>{moment(data.created_at).tz("Asia/Dubai").format("YYYY-MM-DD HH:mm")}</p>
                            </div>

                            <div className="row">
                                <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                    <label>Dangerous Goods Classification</label>
                                    <p className="mb-0">
                                        {
                                            data.dgs == 'Y' ? (
                                                <a rel="noreferrer" target="_blank" href={`${config.imageUrl}${data.dgs_doc}`}>
                                                    <Image src="/images/add-document.svg" alt="" width={17} height={21} />
                                                </a>
                                            ) : ""
                                        }
                                        <span><p>{data.dgs == 'Y' ? "Yes" : "No"}</p></span>
                                    </p>
                                </div>

                                {
                                    data.quantity ? (
                                        <div className="col-lg-3 col-md-6 col-sm-6 col-6 mb-2">
                                            <label>Quantity</label>
                                            <p>{data.quantity}</p>
                                        </div>
                                    ) : ""
                                }

                                {
                                    data.cargo_dimension
                                        ?
                                        <>
                                            {
                                                data.is_dimension == '1'
                                                    ?
                                                    <>
                                                        <div className='col-xl-3 col-md-6 col-sm-6 mb-2'>
                                                            <div>
                                                                <label>Cargo Length</label>
                                                                <p>{numberWithCommas(data.cargo_dimension.split("x")[0])} {data.cargo_dimension.split("x")[3].toUpperCase()}</p>
                                                            </div>
                                                        </div>
                                                        <div className='col-xl-3 col-md-6 col-sm-6 mb-2'>
                                                            <div>
                                                                <label>Cargo Width</label>
                                                                <p>{numberWithCommas(data.cargo_dimension.split("x")[1])} {data.cargo_dimension.split("x")[3].toUpperCase()}</p>
                                                            </div>
                                                        </div>
                                                        <div className='col-xl-3 col-md-6 col-sm-6 mb-2'>
                                                            <div>
                                                                <label>Cargo Height</label>
                                                                <p>{numberWithCommas(data.cargo_dimension.split("x")[2])} {data.cargo_dimension.split("x")[3].toUpperCase()}</p>
                                                            </div>
                                                        </div>
                                                    </>
                                                    :
                                                    <div className='col-xl-3 col-md-6 col-sm-6 mb-2'>
                                                        <div>
                                                            <label>Cargo Volume</label>
                                                            <p>{numberWithCommas(data.cargo_dimension)} CBM</p>
                                                        </div>
                                                    </div>
                                            }
                                        </>
                                        : ""
                                }

                                {
                                    data.cargo_weight ? (
                                        <div className='col-xl-3 col-md-6 col-sm-6 mb-2'>
                                            <div>
                                                <label>Cargo Weight</label>
                                                <p>{numberWithCommas(data.cargo_weight)} {data.cargo_weight_unit.toUpperCase()}</p>
                                            </div>
                                        </div>
                                    ) : ""
                                }

                                {
                                    data.mode?.slug != 'land'
                                        ?
                                        <div className='col-xl-3 col-md-6 col-sm-6 mb-2'>
                                            <div>
                                                <label>Cargo Readiness Date</label>
                                                <p>{data.cargo_readiness_date}</p>
                                            </div>
                                        </div>
                                        : ""
                                }

                                {
                                    data.attach_packing_list
                                        ?
                                        <div className='col-xl-3 col-md-6 col-sm-6 mb-2'>
                                            <div>
                                                <label>Packing list</label>
                                                <p>
                                                    <a style={{ color: "#f6a931" }} href={`${config.imageUrl}${data.attach_packing_list}`} rel="noreferrer" target="_blank">View packing list</a>
                                                </p>
                                            </div>
                                        </div>
                                        : ""
                                }
                            </div>

                        </div>
                    </div>

                    <div className="carrier-information-box-header">
                        <h5>Shipping Address</h5>
                    </div>

                    <div className="carrier-information-inner mt-2">
                        <div className="col-md-12">
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="shipping_address_outer">
                                        <div className="shipping_address_row">
                                            {
                                                data.originCountry != 0 && data.originCountry ? (
                                                    <div className="position-relative">
                                                        <span className="shipping_icons">
                                                            <Image src="/images/port.svg" alt="" width={35} height={34} />
                                                        </span>
                                                        <label>Origin Country</label>
                                                        <p>{data.originCountry?.name}</p>
                                                    </div>
                                                ) : ""
                                            }
                                            {
                                                data.portDischarge != 0 && data.portDischarge ? (
                                                    <div className="position-relative">
                                                        <span className="shipping_icons">
                                                            <Image src="/images/port.svg" alt="" width={35} height={34} />
                                                        </span>
                                                        <label>Port of discharge</label>
                                                        <p>{data.portDischarge?.name}</p>
                                                    </div>
                                                ) : ""
                                            }

                                            {
                                                data.originPort != 0 && data.originPort ? (
                                                    <div className="position-relative">
                                                        <span className="shipping_icons">
                                                            <Image src="/images/port.svg" alt="" width={35} height={34} />
                                                        </span>
                                                        <label>Origin Port</label>
                                                        <p>{data.originPort?.name}</p>
                                                    </div>
                                                ) : ""
                                            }
                                        </div>
                                        {
                                            data.originCity != 0 && data.originCity ? (
                                                <div className="shipping_address_row">
                                                    <div className="position-relative">
                                                        <span className="shipping_icons">
                                                            <Image src="/images/city.svg" alt="" width={35} height={34} />
                                                        </span>
                                                        <label>Origin City</label>
                                                        <p>{data.originCity?.name}</p>
                                                    </div>
                                                </div>
                                            ) : ""
                                        }
                                        {
                                            data.origin_address != 0 && data.origin_address ? (
                                                <div className="shipping_address_row">
                                                    <div className="position-relative">
                                                        <span className="shipping_icons">
                                                            <Image src="/images/address1.svg" alt="" width={35} height={34} />
                                                        </span>
                                                        <label>Origin Address</label>
                                                        <p className="mb-2">{data.origin_address}</p>
                                                    </div>
                                                </div>
                                            ) : ""
                                        }
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="shipping_address_outer">
                                        {
                                            data.destinationCountry != 0 && data.destinationCountry ? (
                                                <div className="shipping_address_row">
                                                    <div className="position-relative">
                                                        <span className="shipping_icons">
                                                            <Image src="/images/city.svg" alt="" width={35} height={34} />
                                                        </span>
                                                        <label>Destination Country</label>
                                                        <p>{data.destinationCountry?.name}</p>
                                                    </div>
                                                </div>
                                            ) : ""
                                        }
                                        {
                                            data.portLoading != 0 && data.portLoading ? (
                                                <div className="shipping_address_row">
                                                    <div className="position-relative">
                                                        <span className="shipping_icons">
                                                            <Image src="/images/port.svg" alt="" width={35} height={34} />
                                                        </span>
                                                        <label>Port of Loading</label>
                                                        <p>{data.portLoading?.name}</p>
                                                    </div>
                                                </div>
                                            ) : ""
                                        }
                                        {
                                            data.destinationPort != 0 && data.destinationPort ? (
                                                <div className="shipping_address_row">
                                                    <div className="position-relative">
                                                        <span className="shipping_icons">
                                                            <Image src="/images/port.svg" alt="" width={35} height={34} />
                                                        </span>
                                                        <label>Destination Port</label>
                                                        <p>{data.destinationPort?.name}</p>
                                                    </div>
                                                </div>
                                            ) : ""
                                        }
                                        {
                                            data.destinationCity != 0 && data.destinationCity ? (
                                                <div className="shipping_address_row">
                                                    <div className="position-relative">
                                                        <span className="shipping_icons">
                                                            <Image src="/images/city.svg" alt="" width={35} height={34} />
                                                        </span>
                                                        <label>Destination City</label>
                                                        <p>{data.destinationCity?.name}</p>
                                                    </div>
                                                </div>
                                            ) : ""
                                        }
                                        {
                                            data.destination_address ? (
                                                <div className="shipping_address_row">
                                                    <div className="position-relative">
                                                        <span className="shipping_icons">
                                                            <Image src="/images/address1.svg" alt="" width={35} height={34} />
                                                        </span>
                                                        <label>Destination Address</label>
                                                        <p className="mb-2">{data.destination_address}</p>
                                                    </div>
                                                </div>
                                            ) : ""
                                        }
                                    </div>
                                </div>
                            </div>
                            <div className="hr_line"></div>
                            <div className="row shipping_address_2">

                                {
                                    data.pickup_date_and_time_origin_address ? (
                                        <div className="col-md-6 col-sm-6 col-12 mb-2">
                                            <div className="address_box border-0 pb-2">
                                                <div className="position-relative">
                                                    <span className="location_img">
                                                        <Image src="/images/dark-pin.svg" width={17} height={21} className="green_img1" />
                                                    </span>
                                                    <label>Pickup Date and Time Origin Address</label>
                                                    <p>{moment(data.pickup_date_and_time_origin_address).tz("Asia/Dubai").format("YYYY-MM-DD HH:mm")}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : ""
                                }
                                {
                                    data.delivery_date_and_time_origin_port ? (
                                        <div className="col-md-6 col-sm-6 col-12 mb-2">
                                            <div className="address_box border-0 pb-2">
                                                <div className="position-relative">
                                                    <span className="location_img">
                                                        <Image src="/images/dark-pin.svg" width={17} height={21} className="green_img1" />
                                                    </span>
                                                    <label>Delivery Date and Time Origin Port</label>
                                                    <p>{moment(data.delivery_date_and_time_origin_port).tz("Asia/Dubai").format("YYYY-MM-DD HH:mm")}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : ""
                                }

                                {
                                    data.pickup_date_and_time_destination_port ? (
                                        <div className="col-md-6 col-sm-6 col-12 mb-2">
                                            <div className="address_box border-0 pb-2">
                                                <div className="position-relative">
                                                    <span className="location_img">
                                                        <Image src="/images/dark-pin.svg" width={17} height={21} className="green_img1" />
                                                    </span>
                                                    <label>Pickup Date and Time Destination Port</label>
                                                    <p>{moment(data.pickup_date_and_time_destination_port).tz("Asia/Dubai").format("YYYY-MM-DD HH:mm")}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : ""
                                }

                                {
                                    data.delivery_date_and_time_destination_address ? (
                                        <div className="col-md-6 col-sm-6 col-12 mb-2">
                                            <div className="address_box border-0 pb-2">
                                                <div className="position-relative">
                                                    <span className="location_img">
                                                        <Image src="/images/dark-pin.svg" width={17} height={21} className="green_img1" />
                                                    </span>
                                                    <label>Delivery Date and Time Destination Address</label>
                                                    <p>{moment(data.delivery_date_and_time_destination_address).tz("Asia/Dubai").format("YYYY-MM-DD HH:mm")}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : ""
                                }
                            </div>
                            <div className="row">
                                <div className="hr_line"></div>
                                <div className="col-md-12 mt-3">
                                    <label>Terms and Conditions</label>
                                    <p style={{ overflowWrap: "break-word" }}>{data.additional_comments ? data.additional_comments : "N/A"}</p>
                                    {/* <button className="btn shipping_cancel_btn mt-1 mb-3">Cancel</button> */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}