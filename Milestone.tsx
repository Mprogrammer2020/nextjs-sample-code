import Image from "next/image"
import { ChangeEvent, Dispatch, FormEvent, SetStateAction, SyntheticEvent, useCallback, useEffect, useState } from "react";
import { Form, Modal, Table } from "react-bootstrap"
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Swal, { SweetAlertResult } from "sweetalert2";
import { checkDocfile, handleSpaceBar, fireAlert, jsonObj, setDateFormat } from "../../helpers/validation";
import toast from "../Toast"
import CustomPagination from "../CustomPagination"
import moment from "moment-timezone";
import Link from "next/link";
import { config } from "../../config/config";
import { errDiv } from "../../helpers/dropdown";
import { useRouter } from "next/router";
import { shipmentServices } from "../../services/shipment.services";

interface milestoneInterface {
    accountType: string,
    data: jsonObj,
    offerData: jsonObj,
    loading: Dispatch<SetStateAction<boolean>>
    reloadTemp: Dispatch<SetStateAction<boolean>>
    selector: jsonObj
}

const Milestone = ({ accountType, data, offerData, loading, reloadTemp, selector }: milestoneInterface) => {
    const [steps, setSteps] = useState<Array<any>>([])
    const [totalPage, setTotalPage] = useState(1)
    const [dateValues, setDateValues] = useState<jsonObj>({})
    const [timeValues, setTimeValues] = useState<jsonObj>({})
    const [driverModal, setDriverModal] = useState(false)
    const [drivers, setDrivers] = useState<Array<any>>([])
    const [activePage, setActivePage] = useState(0)
    const [activeMilestone, setActiveMilestone] = useState<jsonObj>({})
    const [driver, setDriver] = useState<jsonObj>({})
    const [deliverBtnDisable, setDeliverBtnDisable] = useState(true)
    const [PODFiles, setPODFiles] = useState<File[]>([])
    const [invoiceFile, setInvoiceFile] = useState<File>()
    const [showUploadProof, setShowUploadProof] = useState(false)
    const [showRejectShipper, setShowRejectShipper] = useState(false)
    const [rejectReason, setRejectReason] = useState("")
    const [blNumber, setBlNumber] = useState("")
    const [showReasonError, setShowReasonError] = useState(false)
    const [multipleDrivers, setMultipleDrivers] = useState([])
    const [driverAssignModal, setDriverAssignModal] = useState(false)
    const [assignedDriversList, setAssignedDriversList] = useState<Array<jsonObj>>([])
    const router = useRouter()

    useEffect(() => {
        if (data.invoice?.admin_delivery_approved == 2) {
            setShowUploadProof(true)
        }
        if (data.bl_number) {
            setBlNumber(data.bl_number)
        }
        shipmentServices.driverList(activePage).then(resp => {
            setDrivers(resp.data.data)
            setTotalPage(resp.data.totalPages)
        }).catch(err => console.error(err))
        if (data.milestones && !steps.length) {
            let tempSteps = data.milestones.map((m: jsonObj) => m.milestoneType.milestone_type)
            setSteps(tempSteps)
            let dateVals: jsonObj = {}
            let timeVals: jsonObj = {}
            data.milestones.forEach((element: jsonObj) => {
                if (element.milestone_date) {
                    let dt = moment(new Date(element.milestone_date)).tz("Asia/Dubai").format("YYYY/MM/DD HH:mm").split(" ")
                    dateVals[element.milestoneType.milestone_type] = new Date(dt[0])
                    timeVals[element.milestoneType.milestone_type] = dt[1]
                } else {
                    dateVals[element.milestoneType.milestone_type] = ""
                    timeVals[element.milestoneType.milestone_type] = ""
                }
            });
            setDateValues(dateVals)
            setTimeValues(timeVals)
        }

        if (checkUncompletedMilestones().length == 0) {
            setDeliverBtnDisable(false)
        }
    }, [activePage, data])

    function checkUncompletedMilestones() {
        if (data.milestones) {
            return data.milestones.filter((m: jsonObj) => m.is_completed == '0')
        }
        else return ["1"]
    }

    const notify = useCallback((type, message) => {
        toast.dismiss()
        toast({ type, message });
    }, []);

    function selectMilestoneDriver() {
        loading(true)
        let params = {}
        if (data.quantity > 1) {
            params = {
                multi_driver_ids: multipleDrivers.toString()
            }
        } else {
            params = {
                multi_driver_ids: driver.id
            }
        }
        shipmentServices.updateMileStone(activeMilestone?.id, params).then(resp => {
            notify("success", "Drivers assigned successfully.")
            setMultipleDrivers([])
            loading(false)
            setDriverModal(false)
            reloadTemp((t: boolean) => !t)
        }).catch(error => {
            loading(false)
            if (error.response?.status == 401) {
                router.push("/login")
            }
            if (error.response?.status == 400) {
                notify("error", error.response.data.message)
            } else {
                notify("error", "An error occured.")
            }
        })
    }

    // remove uploaded file (onChange input file.)
    function removePODFile(i: Number) {
        let tempFiles = [...PODFiles]
        if (i > -1) {
            setPODFiles(tempFiles.filter((f: Object, index: number) => index != i))
        }
    }

    // mark a milestone with date/time.
    function markDone(type: string, event: jsonObj) {
        if (dateValues[type] && timeValues[type]) {
            fireAlert("Do you want to mark this as done?", "Mark as Done").then((result: SweetAlertResult<any>) => {
                if (result.isConfirmed) {
                    loading(true)
                    let ms = data.milestones.find((m: jsonObj) => m.milestoneType.milestone_type == type)
                    shipmentServices.updateMileStone(ms?.id, { milestone_date: `${setDateFormat(dateValues[type])} ${timeValues[type]}`, is_completed: "1" }).then(resp => {
                        notify("success", "Milestone marked as done successfully.")
                        loading(false)
                        setDriverModal(false)
                        reloadTemp((t: boolean) => !t)
                    }).catch(error => {
                        loading(false)
                        if (error.response?.status == 401) {
                            router.push("/login")
                        }
                        if (error.response?.status == 400) {
                            notify("error", error.response.data.message)
                        } else if (error.response?.status == 403) {
                            notify("error", error.response.data.message)
                        } else {
                            notify("error", "An error occured.")
                        }
                    })
                } else {
                    event.preventDefault()
                }
            })
        } else {
            event.preventDefault()
            notify("warn", "Please input date/time.")
        }
    }

    function getMilestone(type: string) {
        return data.milestones.find((m: jsonObj) => m.milestoneType.milestone_type == type)
    }

    function getPreviousMilestone(currentMilestone: string) {
        let index = steps.indexOf(currentMilestone)
        if (index != 0) {
            return data.milestones.at(index - 1)
        } else {
            return {}
        }
    }

    //check if previous milestone completed
    function previousCompleted(val: string, event: jsonObj) {
        let previousMilestone = getPreviousMilestone(val)
        if (Object.keys(previousMilestone).length) {
            if (previousMilestone?.id && previousMilestone?.is_completed == '1') {
                return true
            } else {
                event.preventDefault()
                notify("warn", "Please complete previous milestone.")
                return false
            }
        } else {
            return true
        }
    }

    function submitFiles() {
        // if (!PODFiles.length && !data.shipmentDeliveryProof) {
        //     notify("warn", "Please upload delivery proof.")
        //     return false
        // } else if (!invoiceFile && !data.manual_invoice_path) {
        //     notify("warn", "Please upload invoice.")
        //     return false
        // } else {

        // }
        let formData = new FormData
        if (invoiceFile) {
            formData.append("manual_invoice", invoiceFile)
        }
        PODFiles.forEach((element: File) => {
            formData.append("delivery_proof", element)
        });
        formData.append("bl_number", blNumber)
        loading(true)
        shipmentServices.addShipmentProofs(data.id, formData).then(resp => {
            loading(false)
            notify("success", "Files uploaded successfully.")
            setPODFiles([])
            reloadTemp((t: boolean) => !t)
        }).catch(err => {
            loading(false)
            if (err.response?.status == 401) {
                router.push("/login")
            }
            if (err.response?.status == 400) {
                notify("error", err.response.data.message)
            } else if (err.response?.status == 403) {
                notify("error", "Forbidden")
            } else {
                notify("error", "An error occured.")
            }
        })
    }

    function deleteUploadedProof(proof_id: string) {
        shipmentServices.deleteDeliveryProof(proof_id).then(resp => {
            notify("success", "Delivery proof removed successfully.")
            loading(false)
            reloadTemp((t: boolean) => !t)
        }).catch(error => {
            loading(false)
            if (error.response?.status == 401) {
                router.push("/login")
            }
            if (error.response?.status == 400) {
                notify("error", error.response.data.message)
            } else if (error.response?.status == 403) {
                notify("error", "Forbidden")
            } else {
                notify("error", "An error occured.")
            }
        })
    }

    function shipperInvoiceAction(action: "1" | "2") {
        loading(true)
        shipmentServices.shipperInvoiceAction(data.invoice?.id, { shipper_delivery_approved: action, reject_reason: rejectReason }).then(resp => {
            loading(false)
            if (action == '1') {
                notify("success", "Shipment invoice accepted successfully.")
            } else {
                notify("success", "Shipment invoice/delivery rejected successfully.")
                setShowRejectShipper(false)
            }
            reloadTemp((t: boolean) => !t)
        }).catch(err => {
            loading(false)
            if (err.response?.status == 401) {
                router.push("/login")
            }
            if (err.response?.status == 400) {
                notify("error", err.response.data.message)
            } else {
                notify("error", "An error occured.")
            }
        })
    }

    function manualInvoice() {
        return (
            <Form.Group className="py-3">
                <a href={`${config.imageUrl}${data.manual_invoice_path}`} rel="noreferrer" target="_blank" className="pod-file-text">View uploaded invoice</a>
            </Form.Group>
        )
    }

    function showProofs(canEdit: boolean = false) { // uploaded delivery proofs listing
        return (
            data.shipmentDeliveryProof.map((proof: jsonObj) => {
                return (
                    <div className={`d-flex ${canEdit ? "justify-content-between" : "justify-content-center"} p-1`} key={'uploaded-proof-' + proof.id}>
                        <a href={`${config.imageUrl}${proof.document_path}`} rel="noreferrer" target="_blank" className="pod-file-text">{proof.document_name}</a>
                        {
                            canEdit ?
                                <img src="/images/crossWithBg.svg" height="22px" className="c-pointer" onClick={() => {
                                    fireAlert("Do you want to remove this document?", "Remove").then((result: SweetAlertResult<any>) => {
                                        if (result.isConfirmed) {
                                            deleteUploadedProof(proof.id)
                                        }
                                    })
                                }} />
                                : ""
                        }
                    </div>
                )
            })

        )
    }

    function InvoiceBtn() {
        return (
            <Link href={"/shipments/invoice/" + data.id}>
                <button type="button" className="btn verify-bt px-5 mb-3">
                    Invoice
                </button>
            </Link>
        )
    }

    function showUploadPODBtn() {
        let show = true
        let allowedFiles = 5
        if (PODFiles.length) {
            allowedFiles = allowedFiles - PODFiles.length
        }
        if (data.shipmentDeliveryProof?.length) {
            allowedFiles = allowedFiles - data.shipmentDeliveryProof.length
        }
        if (allowedFiles < 1) {
            show = false
        }
        return show
    }

    function checkValidMilestoneTime(milestoneType: string, time: string) {
        if (steps.indexOf(milestoneType) > 0) {
            let previousMilestoneDateTime = getPreviousMilestone(milestoneType).milestone_date
            let currentMilestoneDate = dateValues[milestoneType]
            if (!currentMilestoneDate) {
                notify("warn", "Please select date.")
                return false
            } else {
                let currentMilestoneDateTime = new Date((moment(dateValues[milestoneType]).format("YYYY-MM-DD ")) + time)
                if (currentMilestoneDateTime > new Date(moment(previousMilestoneDateTime).tz("Asia/Dubai").format("YYYY/MM/DD HH:mm"))) {
                    return true
                } else {
                    if (previousMilestoneDateTime) {
                        notify("warn", "Date/Time cannot be less than previous milestone DateTime.")
                        setTimeValues((vals: jsonObj) => ({ ...vals, [milestoneType]: "" }))
                        return false
                    } else {
                        notify("warn", "Please complete previous milestone.")
                    }
                }
            }
        } else return true

    }

    return (
        <>
            <div className="col-md-3">
                <div className="milestones_box">
                    <div className="d-flex justify-content-between px-3">
                        <h4 className="milestone_header mb-4">Milestones</h4>
                    </div>
                    <div className="col-md-12">
                        <div className="shipping_address_outer">
                            {
                                steps.includes("PICK_UP_ORIGIN_ADDRESS") ?
                                    <div className="shipping_address_row">
                                        <div className="position-relative">
                                            <span className="shipping_icons milestones_circle_box">
                                                <Image src="/images/first_img.svg" alt="" width={18} height={18} />
                                            </span>
                                            <div className="milestone_box_details">
                                                <label>{moment(data.pickup_date_and_time_origin_address).format("DD/MM/YYYY")}</label>
                                                <div className="milestone_box_details_img">
                                                    <span className="orange_span">
                                                        <Image src="/images/orange-pin.svg" alt="" width={16} height={17} />
                                                    </span>
                                                    <label className="pickup mt-1">
                                                        Picked Up Origin Address
                                                    </label>
                                                    <p className="mb-1">{data.origin_address}</p>
                                                </div>
                                                {
                                                    accountType == 'S' && <>
                                                        {
                                                            getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date ?
                                                                <div className="milestone_box_details_img mt-2">
                                                                    <span className="orange_span" style={{ top: "0" }}>
                                                                        <Image src="/images/orange_clnder.svg" alt="" width={13} height={15} />
                                                                    </span>
                                                                    <p className="mb-1" style={{ fontSize: "12px" }}>{moment(getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date).tz("Asia/Dubai").format("DD/MM/YYYY")}</p>
                                                                </div>
                                                                : ""
                                                        }
                                                    </>
                                                }
                                                {
                                                    accountType == 'C' && (
                                                        <div className="row frominput">
                                                            <div className="col-xl-6 col-lg-12 col-md-6 col-left">
                                                                <div className="calendar_input">
                                                                    <DatePicker showMonthDropdown showYearDropdown
                                                                        minDate={new Date()} disabled={getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date ? true : false} selected={dateValues["PICK_UP_ORIGIN_ADDRESS"] ? dateValues["PICK_UP_ORIGIN_ADDRESS"] : ""} placeholderText="DD/MM/YYYY" dateFormat={"dd/MM/yyyy"} onChange={(val: Date) => {
                                                                            setDateValues((vals: jsonObj) => ({ ...vals, "PICK_UP_ORIGIN_ADDRESS": val }))
                                                                        }} />
                                                                    <i className="fa fa-calendar"></i>
                                                                </div>
                                                            </div>
                                                            <div className="col-xl-6 col-lg-12 col-md-6 col-right">
                                                                <div className="calendar_input time_input">
                                                                    <Form.Control disabled={getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date ? true : false} value={timeValues["PICK_UP_ORIGIN_ADDRESS"] ? timeValues["PICK_UP_ORIGIN_ADDRESS"] : ""} type="time" required={true} placeholder="00:00" onChange={(e) => {
                                                                        setTimeValues((vals: jsonObj) => ({ ...vals, "PICK_UP_ORIGIN_ADDRESS": e.target.value }))
                                                                    }} />
                                                                    <i className="fa fa-clock-o"></i>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                <div className="hr_line2"></div>
                                                {
                                                    accountType == 'S'
                                                        ? <>
                                                            <div className="milestone_bottom">
                                                                {
                                                                    getMilestone("PICK_UP_ORIGIN_ADDRESS")?.driver_assigned == '1' ?
                                                                        <p>
                                                                            <Image src="/images/dark_check.svg" alt="" width={13} height={15} />
                                                                            <span className="ms-1">Assigned to Driver</span>
                                                                        </p>
                                                                        : ""
                                                                }
                                                                {
                                                                    getMilestone("PICK_UP_ORIGIN_ADDRESS")?.is_completed == '1' ?
                                                                        <p style={{ color: "#2AC856" }}>
                                                                            <Image src="/images/green_check.svg" alt="" width={13} height={15} />
                                                                            <span className="ms-1">Marked as Done</span>
                                                                        </p>
                                                                        : ""
                                                                }
                                                            </div>
                                                        </>
                                                        :
                                                        <>
                                                            <div className="chekinput milestonerow d-flex">
                                                                <Form.Check disabled={getMilestone("PICK_UP_ORIGIN_ADDRESS")?.driver_assigned == '1' ? true : false} checked={getMilestone("PICK_UP_ORIGIN_ADDRESS")?.driver_assigned == '1' ? true : false} className="login_hover" type="checkbox" id="pick-1" onClick={(e) => {
                                                                    let ms = data.milestones.find((m: jsonObj) => m.milestoneType.milestone_type == "PICK_UP_ORIGIN_ADDRESS")
                                                                    setActiveMilestone(ms)
                                                                    setDriverModal(true)
                                                                }} />
                                                                <Form.Label className="px-2" htmlFor="pick-1"> {getMilestone("PICK_UP_ORIGIN_ADDRESS")?.driver_assigned == '1' ? "Assigned" : "Assign"} to {data.quantity > 1 ? "drivers" : "driver"} </Form.Label>

                                                                <Form.Check disabled={getMilestone("PICK_UP_ORIGIN_ADDRESS")?.is_completed == '1' ? true : false} checked={getMilestone("PICK_UP_ORIGIN_ADDRESS")?.is_completed == '1' ? true : false} className="login_hover" type="checkbox" id="pick-2" onClick={(e) => {
                                                                    let ms = data.milestones.find((m: jsonObj) => m.milestoneType.milestone_type == "PICK_UP_ORIGIN_ADDRESS")
                                                                    if (ms?.driver_assigned) {
                                                                        markDone("PICK_UP_ORIGIN_ADDRESS", e)
                                                                    } else {
                                                                        e.preventDefault()
                                                                        notify("warn", "Please assign a driver first.")
                                                                    }
                                                                }} />
                                                                <Form.Label htmlFor="pick-2"> {getMilestone("PICK_UP_ORIGIN_ADDRESS")?.is_completed == '1' ? "Marked" : "Mark"} as done </Form.Label>
                                                            </div>

                                                        </>
                                                }
                                                {
                                                    getMilestone("PICK_UP_ORIGIN_ADDRESS")?.driver_assigned == '1' ?
                                                        <>
                                                            {
                                                                data.quantity > 1 ?
                                                                    <label className="btn" onClick={() => {
                                                                        setAssignedDriversList(getMilestone("PICK_UP_ORIGIN_ADDRESS")?.multipleDrivers)
                                                                        setDriverAssignModal(true)
                                                                    }}>View Assigned Drivers</label>
                                                                    :
                                                                    <div>
                                                                        <Form.Label>Driver Name : {getMilestone("PICK_UP_ORIGIN_ADDRESS").multipleDrivers[0]?.driver_name}</Form.Label>
                                                                        <Form.Label>Plate : {getMilestone("PICK_UP_ORIGIN_ADDRESS").multipleDrivers[0]?.vehicle_number}</Form.Label>
                                                                        <Form.Label>Contact : {getMilestone("PICK_UP_ORIGIN_ADDRESS").multipleDrivers[0]?.driver_contact}</Form.Label>
                                                                    </div>
                                                            }
                                                        </>
                                                        : ""
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    : ""
                            }

                            {
                                steps.includes("DROP_ORIGIN_PORT") ?
                                    <div className="shipping_address_row">
                                        <div className="position-relative">
                                            <span className="shipping_icons milestones_circle_box">
                                                <Image src="/images/second_img.svg" alt="" width={18} height={18} />
                                            </span>
                                            <div className="milestone_box_details">
                                                <label>{moment(data.delivery_date_and_time_origin_port).format("DD/MM/YYYY")}</label>
                                                <div className="milestone_box_details_img">
                                                    <span className="orange_span">
                                                        <Image src="/images/orange-pin.svg" alt="" width={16} height={17} />
                                                    </span>
                                                    <label className="pickup mt-1">
                                                        Drop Up of Origin Port
                                                    </label>
                                                    <p className="mb-1">{data.originPort?.name} ({data.originPort?.code})</p>
                                                </div>
                                                {
                                                    accountType == 'S' && <>
                                                        {
                                                            getMilestone("DROP_ORIGIN_PORT")?.milestone_date ?
                                                                <div className="milestone_box_details_img mt-2">
                                                                    <span className="orange_span" style={{ top: "0" }}>
                                                                        <Image src="/images/orange_clnder.svg" alt="" width={13} height={15} />
                                                                    </span>
                                                                    <p className="mb-1" style={{ fontSize: "12px" }}>{moment(getMilestone("DROP_ORIGIN_PORT")?.milestone_date).tz("Asia/Dubai").format("DD/MM/YYYY")}</p>
                                                                </div>
                                                                : ""
                                                        }
                                                    </>
                                                }
                                                {
                                                    accountType == 'C' && (
                                                        <div className="row frominput">
                                                            <div className="col-xl-6 col-lg-12 col-md-6 col-left">
                                                                <div className="calendar_input">
                                                                    <DatePicker showMonthDropdown showYearDropdown
                                                                        minDate={getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date ? new Date(getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date) : new Date()}
                                                                        disabled={getMilestone("DROP_ORIGIN_PORT")?.milestone_date ? true : false} selected={dateValues["DROP_ORIGIN_PORT"] ? dateValues["DROP_ORIGIN_PORT"] : ""} placeholderText="DD/MM/YYYY" dateFormat={"dd/MM/yyyy"}
                                                                        onChange={(val: Date) => {
                                                                            setDateValues((vals: jsonObj) => ({ ...vals, "DROP_ORIGIN_PORT": val }))
                                                                        }} />
                                                                    <i className="fa fa-calendar"></i>
                                                                </div>
                                                            </div>
                                                            <div className="col-xl-6 col-lg-12 col-md-6 col-right">
                                                                <div className="calendar_input time_input">
                                                                    <Form.Control disabled={getMilestone("DROP_ORIGIN_PORT")?.milestone_date ? true : false} type="time" required={true} placeholder="00:00" value={timeValues["DROP_ORIGIN_PORT"] ? timeValues["DROP_ORIGIN_PORT"] : ""}
                                                                        onChange={(e) => {
                                                                            let val = e.target.value
                                                                            if (checkValidMilestoneTime("DROP_ORIGIN_PORT", val)) {
                                                                                setTimeValues((vals: jsonObj) => ({ ...vals, "DROP_ORIGIN_PORT": val }))
                                                                            }
                                                                        }} />
                                                                    <i className="fa fa-clock-o"></i>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                <div className="hr_line2"></div>
                                                <div className="milestone_bottom">
                                                    {
                                                        accountType == 'S'
                                                            ?
                                                            <>
                                                                {
                                                                    getMilestone("DROP_ORIGIN_PORT")?.is_completed == '1' ?
                                                                        <p style={{ color: "#2AC856" }}>
                                                                            <Image src="/images/green_check.svg" alt="" width={13} height={15} />
                                                                            <span className="ms-1">Marked as Done</span>
                                                                        </p>
                                                                        : ""
                                                                }
                                                            </>
                                                            :
                                                            <div className="chekinput milestonerow d-flex">
                                                                <Form.Check className="login_hover" type="checkbox" id="drop-2" disabled={getMilestone("DROP_ORIGIN_PORT")?.is_completed == '1' ? true : false} checked={getMilestone("DROP_ORIGIN_PORT")?.is_completed == '1' ? true : false}
                                                                    onClick={(e) => {
                                                                        if (previousCompleted("DROP_ORIGIN_PORT", e)) {
                                                                            markDone("DROP_ORIGIN_PORT", e)
                                                                        }
                                                                    }} />
                                                                <Form.Label htmlFor="drop-2"> {getMilestone("DROP_ORIGIN_PORT")?.is_completed == '1' ? "Marked" : "Mark"} as done </Form.Label>
                                                            </div>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    : ""
                            }

                            {
                                steps.includes("PICK_UP_ORIGIN_PORT") ?
                                    <div className="shipping_address_row">
                                        <div className="position-relative">
                                            <span className="shipping_icons milestones_circle_box">
                                                <Image src="/images/third_img.svg" alt="" width={18} height={18} />
                                            </span>
                                            <div className="milestone_box_details">
                                                {
                                                    offerData?.departure_date ?
                                                        <label>{moment(offerData.departure_date).format("DD/MM/YYYY")}</label>
                                                        : ""
                                                }
                                                <div className="milestone_box_details_img">
                                                    <span className="orange_span">
                                                        <Image src="/images/orange-pin.svg" alt="" width={16} height={17} />
                                                    </span>
                                                    <label className="pickup mt-1">
                                                        Departure from Origin Port
                                                    </label>
                                                    <p className="mb-1">{data.originPort?.name} ({data.originPort?.code})</p>
                                                </div>
                                                {
                                                    accountType == 'S' && <>
                                                        {
                                                            getMilestone("PICK_UP_ORIGIN_PORT")?.milestone_date ?
                                                                <div className="milestone_box_details_img mt-2">
                                                                    <span className="orange_span" style={{ top: "0" }}>
                                                                        <Image src="/images/orange_clnder.svg" alt="" width={13} height={15} />
                                                                    </span>
                                                                    <p className="mb-1" style={{ fontSize: "12px" }}>{moment(getMilestone("PICK_UP_ORIGIN_PORT")?.milestone_date).tz("Asia/Dubai").format("DD/MM/YYYY")}</p>
                                                                </div>
                                                                : ""
                                                        }
                                                    </>
                                                }
                                                {
                                                    accountType == 'C' && (
                                                        <div className="row frominput">
                                                            <div className="col-xl-6 col-lg-12 col-md-6 col-left">
                                                                <div className="calendar_input">
                                                                    <DatePicker showMonthDropdown showYearDropdown
                                                                        minDate={getMilestone("DROP_ORIGIN_PORT")?.milestone_date ? new Date(getMilestone("DROP_ORIGIN_PORT")?.milestone_date) : getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date ? new Date(getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date) : new Date()}
                                                                        placeholderText="DD/MM/YYYY" dateFormat={"dd/MM/yyyy"} disabled={getMilestone("PICK_UP_ORIGIN_PORT")?.milestone_date ? true : false} selected={dateValues["PICK_UP_ORIGIN_PORT"] ? dateValues["PICK_UP_ORIGIN_PORT"] : ""}
                                                                        onChange={(val: Date) => {
                                                                            setDateValues((vals: jsonObj) => ({ ...vals, "PICK_UP_ORIGIN_PORT": val }))
                                                                        }} />
                                                                    <i className="fa fa-calendar"></i>
                                                                </div>
                                                            </div>
                                                            <div className="col-xl-6 col-lg-12 col-md-6 col-right">
                                                                <div className="calendar_input time_input">
                                                                    <Form.Control disabled={getMilestone("PICK_UP_ORIGIN_PORT")?.milestone_date ? true : false} type="time" required={true} placeholder="00:00" value={timeValues["PICK_UP_ORIGIN_PORT"] ? timeValues["PICK_UP_ORIGIN_PORT"] : ""}
                                                                        onChange={(e) => {
                                                                            let val = e.target.value
                                                                            if (checkValidMilestoneTime("PICK_UP_ORIGIN_PORT", val)) {
                                                                                setTimeValues((vals: jsonObj) => ({ ...vals, "PICK_UP_ORIGIN_PORT": e.target.value }))
                                                                            }
                                                                        }} />
                                                                    <i className="fa fa-clock-o"></i>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                <div className="hr_line2"></div>
                                                <div className="milestone_bottom">
                                                    {
                                                        accountType == 'S' ?
                                                            <>
                                                                {
                                                                    getMilestone("PICK_UP_ORIGIN_PORT")?.is_completed == '1' ?
                                                                        <p style={{ color: "#2AC856" }}>
                                                                            <Image src="/images/green_check.svg" alt="" width={13} height={15} />
                                                                            <span className="ms-1">Marked as Done</span>
                                                                        </p>
                                                                        : ""
                                                                }
                                                            </>
                                                            :
                                                            <div className="chekinput milestonerow d-flex">
                                                                <Form.Check disabled={getMilestone("PICK_UP_ORIGIN_PORT")?.is_completed == '1' ? true : false} checked={getMilestone("PICK_UP_ORIGIN_PORT")?.is_completed == '1' ? true : false} className="login_hover" type="checkbox" id="orig-1" onClick={(e) => {
                                                                    if (previousCompleted("PICK_UP_ORIGIN_PORT", e)) {
                                                                        markDone("PICK_UP_ORIGIN_PORT", e)
                                                                    }
                                                                }} />
                                                                <Form.Label htmlFor="orig-1"> {getMilestone("PICK_UP_ORIGIN_PORT")?.is_completed == '1' ? "Marked" : "Mark"} as done </Form.Label>
                                                            </div>

                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    : ""
                            }

                            {
                                steps.includes("DROP_DESTINATION_PORT") ?
                                    <div className="shipping_address_row">
                                        <div className="position-relative">
                                            <span className="shipping_icons milestones_circle_box">
                                                <Image src="/images/fourth_img.svg" alt="" width={18} height={18} />
                                            </span>
                                            <div className="milestone_box_details">
                                                {
                                                    offerData?.arrival_date ?
                                                        <label>{moment(offerData.arrival_date).format("DD/MM/YYYY")}</label>
                                                        : ""
                                                }
                                                <div className="milestone_box_details_img">
                                                    <span className="orange_span">
                                                        <Image src="/images/orange-pin.svg" alt="" width={16} height={17} />
                                                    </span>
                                                    <label className="pickup mt-1">
                                                        Arrival at Destination Port
                                                    </label>
                                                    <p className="mb-1">{data.destinationPort?.name} ({data.destinationPort?.code})</p>
                                                </div>
                                                {
                                                    accountType == 'S' && <>
                                                        {
                                                            getMilestone("DROP_DESTINATION_PORT")?.milestone_date ?
                                                                <div className="milestone_box_details_img mt-2">
                                                                    <span className="orange_span" style={{ top: "0" }}>
                                                                        <Image src="/images/orange_clnder.svg" alt="" width={13} height={15} />
                                                                    </span>
                                                                    <p className="mb-1" style={{ fontSize: "12px" }}>{moment(getMilestone("DROP_DESTINATION_PORT")?.milestone_date).tz("Asia/Dubai").format("DD/MM/YYYY")}</p>
                                                                </div>
                                                                : ""
                                                        }
                                                    </>
                                                }
                                                {
                                                    accountType == 'C' && (
                                                        <div className="row frominput">
                                                            <div className="col-xl-6 col-lg-12 col-md-6 col-left">
                                                                <div className="calendar_input">
                                                                    <DatePicker showMonthDropdown showYearDropdown
                                                                        minDate={getMilestone("PICK_UP_ORIGIN_PORT")?.milestone_date ? new Date(getMilestone("PICK_UP_ORIGIN_PORT")?.milestone_date) : getMilestone("DROP_ORIGIN_PORT")?.milestone_date ? new Date(getMilestone("DROP_ORIGIN_PORT")?.milestone_date) : getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date ? new Date(getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date) : new Date()}
                                                                        placeholderText="DD/MM/YYYY" dateFormat={"dd/MM/yyyy"} disabled={getMilestone("DROP_DESTINATION_PORT")?.milestone_date ? true : false} selected={dateValues["DROP_DESTINATION_PORT"] ? dateValues["DROP_DESTINATION_PORT"] : ""}
                                                                        onChange={(val: Date) => {
                                                                            setDateValues((vals: jsonObj) => ({ ...vals, "DROP_DESTINATION_PORT": val }))
                                                                        }} />
                                                                    <i className="fa fa-calendar"></i>
                                                                </div>
                                                            </div>
                                                            <div className="col-xl-6 col-lg-12 col-md-6 col-right">
                                                                <div className="calendar_input time_input">
                                                                    <Form.Control type="time" required={true} placeholder="00:00" disabled={getMilestone("DROP_DESTINATION_PORT")?.milestone_date ? true : false} value={timeValues["DROP_DESTINATION_PORT"] ? timeValues["DROP_DESTINATION_PORT"] : ""}
                                                                        onChange={(e) => {
                                                                            let val = e.target.value
                                                                            if (checkValidMilestoneTime("DROP_DESTINATION_PORT", val)) {
                                                                                setTimeValues((vals: jsonObj) => ({ ...vals, "DROP_DESTINATION_PORT": e.target.value }))
                                                                            }
                                                                        }} />
                                                                    <i className="fa fa-clock-o"></i>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                <div className="hr_line2"></div>
                                                <div className="milestone_bottom">
                                                    {
                                                        accountType == 'S' ?
                                                            <>
                                                                {
                                                                    getMilestone("DROP_DESTINATION_PORT")?.is_completed == '1' ?
                                                                        <p style={{ color: "#2AC856" }}>
                                                                            <Image src="/images/green_check.svg" alt="" width={13} height={15} />
                                                                            <span className="ms-1">Marked as Done</span>
                                                                        </p>
                                                                        : ""
                                                                }
                                                            </>
                                                            :
                                                            <div className="chekinput milestonerow d-flex">
                                                                <Form.Check disabled={getMilestone("DROP_DESTINATION_PORT")?.is_completed == '1' ? true : false} className="login_hover" type="checkbox" id="desti-1" checked={getMilestone("DROP_DESTINATION_PORT")?.is_completed == '1' ? true : false} onClick={(e) => {
                                                                    if (previousCompleted("DROP_DESTINATION_PORT", e)) {
                                                                        markDone("DROP_DESTINATION_PORT", e)
                                                                    }
                                                                }} />
                                                                <Form.Label htmlFor="desti-1"> {getMilestone("DROP_DESTINATION_PORT")?.is_completed == '1' ? "Marked" : "Mark"} as done </Form.Label>
                                                            </div>

                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    : ""
                            }

                            {
                                steps.includes("PICK_UP_DESTINATION_PORT") ?
                                    <div className="shipping_address_row">
                                        <div className="position-relative">
                                            <span className="shipping_icons milestones_circle_box">
                                                <Image src="/images/fifth_img.svg" alt="" width={18} height={18} />
                                            </span>
                                            <div className="milestone_box_details">
                                                <label>{moment(data.pickup_date_and_time_destination_port).format("DD/MM/YYYY")}</label>
                                                <div className="milestone_box_details_img">
                                                    <span className="orange_span">
                                                        <Image src="/images/orange-pin.svg" alt="" width={16} height={17} />
                                                    </span>
                                                    <label className="pickup mt-1">
                                                        Picked from Destination Port
                                                    </label>
                                                    <p className="mb-1">{data.destinationPort?.name} ({data.destinationPort?.code})</p>
                                                </div>
                                                {
                                                    accountType == 'S' && <>
                                                        {
                                                            getMilestone("PICK_UP_DESTINATION_PORT")?.milestone_date ?
                                                                <div className="milestone_box_details_img mt-2">
                                                                    <span className="orange_span" style={{ top: "0" }}>
                                                                        <Image src="/images/orange_clnder.svg" alt="" width={13} height={15} />
                                                                    </span>
                                                                    <p className="mb-1" style={{ fontSize: "12px" }}>{moment(getMilestone("PICK_UP_DESTINATION_PORT")?.milestone_date).tz("Asia/Dubai").format("DD/MM/YYYY")}</p>
                                                                </div>
                                                                : ""
                                                        }
                                                    </>
                                                }
                                                {
                                                    accountType == 'C' && (
                                                        <div className="row frominput">
                                                            <div className="col-xl-6 col-lg-12 col-md-6 col-left">
                                                                <div className="calendar_input">
                                                                    <DatePicker showMonthDropdown showYearDropdown
                                                                        minDate={getMilestone("DROP_DESTINATION_PORT")?.milestone_date ? new Date(getMilestone("DROP_DESTINATION_PORT")?.milestone_date) : getMilestone("PICK_UP_ORIGIN_PORT")?.milestone_date ? new Date(getMilestone("PICK_UP_ORIGIN_PORT")?.milestone_date) : getMilestone("DROP_ORIGIN_PORT")?.milestone_date ? new Date(getMilestone("DROP_ORIGIN_PORT")?.milestone_date) : getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date ? new Date(getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date) : new Date()}
                                                                        placeholderText="DD/MM/YYYY" dateFormat={"dd/MM/yyyy"} disabled={getMilestone("PICK_UP_DESTINATION_PORT")?.milestone_date ? true : false} selected={dateValues["PICK_UP_DESTINATION_PORT"] ? dateValues["PICK_UP_DESTINATION_PORT"] : ""}
                                                                        onChange={(val: Date) => {
                                                                            setDateValues((vals: jsonObj) => ({ ...vals, "PICK_UP_DESTINATION_PORT": val }))
                                                                        }} />
                                                                    <i className="fa fa-calendar"></i>
                                                                </div>
                                                            </div>
                                                            <div className="col-xl-6 col-lg-12 col-md-6 col-right">
                                                                <div className="calendar_input time_input">
                                                                    <Form.Control type="time" required={true} placeholder="00:00" disabled={getMilestone("PICK_UP_DESTINATION_PORT")?.milestone_date ? true : false} value={timeValues["PICK_UP_DESTINATION_PORT"] ? timeValues["PICK_UP_DESTINATION_PORT"] : ""}
                                                                        onChange={(e) => {
                                                                            let val = e.target.value
                                                                            if (checkValidMilestoneTime("PICK_UP_DESTINATION_PORT", val)) {
                                                                                setTimeValues((vals: jsonObj) => ({ ...vals, "PICK_UP_DESTINATION_PORT": e.target.value }))
                                                                            }
                                                                        }} />
                                                                    <i className="fa fa-clock-o"></i>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                <div className="hr_line2"></div>
                                                {
                                                    accountType == 'S' ?
                                                        <>
                                                            <div className="milestone_bottom">
                                                                {
                                                                    getMilestone("PICK_UP_DESTINATION_PORT")?.driver_assigned == '1' ?
                                                                        <p>
                                                                            <Image src="/images/dark_check.svg" alt="" width={13} height={15} />
                                                                            <span className="ms-1">Assigned to Driver</span>
                                                                        </p>
                                                                        : ""
                                                                }
                                                                {
                                                                    getMilestone("PICK_UP_DESTINATION_PORT")?.is_completed == '1' ?
                                                                        <p style={{ color: "#2AC856" }}>
                                                                            <Image src="/images/green_check.svg" alt="" width={13} height={15} />
                                                                            <span className="ms-1">Marked as Done</span>
                                                                        </p>
                                                                        : ""
                                                                }
                                                            </div>
                                                        </>
                                                        :
                                                        <>
                                                            <div className="chekinput milestonerow d-flex">
                                                                <Form.Check disabled={getMilestone("PICK_UP_DESTINATION_PORT")?.driver_assigned == '1' ? true : false} className="login_hover" checked={getMilestone("PICK_UP_DESTINATION_PORT")?.driver_assigned == '1' ? true : false} type="checkbox" id="dest-1" onClick={(e) => {
                                                                    let ms = data.milestones.find((m: jsonObj) => m.milestoneType.milestone_type == "PICK_UP_DESTINATION_PORT")
                                                                    if (previousCompleted("PICK_UP_DESTINATION_PORT", e)) {
                                                                        let ms = data.milestones.find((m: jsonObj) => m.milestoneType.milestone_type == "PICK_UP_DESTINATION_PORT")
                                                                        setActiveMilestone(ms)
                                                                        setDriverModal(true)
                                                                    }
                                                                }} />
                                                                <Form.Label className="px-2" htmlFor="dest-1"> {getMilestone("PICK_UP_DESTINATION_PORT")?.driver_assigned == '1' ? "Assigned" : "Assign"} to {data.quantity > 1 ? "drivers" : "driver"} </Form.Label>
                                                                <Form.Check disabled={getMilestone("PICK_UP_DESTINATION_PORT")?.is_completed == '1' ? true : false} className="login_hover" checked={getMilestone("PICK_UP_DESTINATION_PORT")?.is_completed == '1' ? true : false} type="checkbox" id="dest-2" onClick={(e) => {
                                                                    if (previousCompleted("PICK_UP_DESTINATION_PORT", e)) {
                                                                        let ms = data.milestones.find((m: jsonObj) => m.milestoneType.milestone_type == "PICK_UP_DESTINATION_PORT")
                                                                        if (ms?.driver_assigned) {
                                                                            markDone("PICK_UP_DESTINATION_PORT", e)
                                                                        } else {
                                                                            e.preventDefault()
                                                                            notify("warn", "Please assign a driver first.")
                                                                        }
                                                                    }
                                                                }} />
                                                                <Form.Label htmlFor="dest-2"> {getMilestone("PICK_UP_DESTINATION_PORT")?.is_completed == '1' ? "Marked" : "Mark"} as done </Form.Label>
                                                            </div>
                                                        </>
                                                }
                                                {
                                                    getMilestone("PICK_UP_DESTINATION_PORT")?.driver_assigned == '1' ?
                                                        <>
                                                            {
                                                                data.quantity > 1 ?
                                                                    <label className="btn" onClick={() => {
                                                                        setAssignedDriversList(getMilestone("PICK_UP_DESTINATION_PORT")?.multipleDrivers)
                                                                        setDriverAssignModal(true)
                                                                    }}>View Assigned Drivers</label>
                                                                    :
                                                                    <div>
                                                                        <Form.Label>Driver Name : {getMilestone("PICK_UP_DESTINATION_PORT").multipleDrivers[0]?.driver_name}</Form.Label>
                                                                        <Form.Label>Plate : {getMilestone("PICK_UP_DESTINATION_PORT").multipleDrivers[0]?.vehicle_number}</Form.Label>
                                                                        <Form.Label>Contact : {getMilestone("PICK_UP_DESTINATION_PORT").multipleDrivers[0]?.driver_contact}</Form.Label>
                                                                    </div>
                                                            }
                                                        </>
                                                        : ""
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    : ""
                            }

                            {
                                steps.includes("DROP_DESTINATION_ADDRESS") ?
                                    <div className="shipping_address_row">
                                        <div className="position-relative">
                                            <span className="shipping_icons milestones_circle_box">
                                                <Image src="/images/six_img.svg" alt="" width={18} height={18} />
                                            </span>
                                            <div className="milestone_box_details">
                                                <label>{moment(data.delivery_date_and_time_destination_address).format("DD/MM/YYYY")}</label>
                                                <div className="milestone_box_details_img">
                                                    <span className="orange_span">
                                                        <Image src="/images/orange-pin.svg" alt="" width={16} height={17} />
                                                    </span>
                                                    <label className="pickup mt-1">
                                                        Drop of final Destination
                                                    </label>
                                                    <p className="mb-1">{data.destination_address}</p>
                                                </div>

                                                {
                                                    accountType == 'S' && <>
                                                        {
                                                            getMilestone("DROP_DESTINATION_ADDRESS")?.milestone_date ?
                                                                <div className="milestone_box_details_img mt-2">
                                                                    <span className="orange_span" style={{ top: "0" }}>
                                                                        <Image src="/images/orange_clnder.svg" alt="" width={13} height={15} />
                                                                    </span>
                                                                    <p className="mb-1" style={{ fontSize: "12px" }}>{moment(getMilestone("DROP_DESTINATION_ADDRESS")?.milestone_date).tz("Asia/Dubai").format("DD/MM/YYYY")}</p>
                                                                </div>
                                                                : ""
                                                        }
                                                    </>
                                                }

                                                {
                                                    accountType == 'C' && (
                                                        <div className="row frominput">
                                                            <div className="col-md-6">
                                                                <div className="calendar_input">
                                                                    <DatePicker showMonthDropdown showYearDropdown
                                                                        minDate={getMilestone("PICK_UP_DESTINATION_PORT")?.milestone_date ? new Date(getMilestone("PICK_UP_DESTINATION_PORT")?.milestone_date) : getMilestone("DROP_DESTINATION_PORT")?.milestone_date ? new Date(getMilestone("DROP_DESTINATION_PORT")?.milestone_date) : getMilestone("PICK_UP_ORIGIN_PORT")?.milestone_date ? new Date(getMilestone("PICK_UP_ORIGIN_PORT")?.milestone_date) : getMilestone("DROP_ORIGIN_PORT")?.milestone_date ? new Date(getMilestone("DROP_ORIGIN_PORT")?.milestone_date) : getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date ? new Date(getMilestone("PICK_UP_ORIGIN_ADDRESS")?.milestone_date) : new Date()}
                                                                        placeholderText="DD/MM/YYYY" dateFormat={"dd/MM/yyyy"} disabled={getMilestone("DROP_DESTINATION_ADDRESS")?.milestone_date ? true : false} selected={dateValues["DROP_DESTINATION_ADDRESS"] ? dateValues["DROP_DESTINATION_ADDRESS"] : ""}
                                                                        onChange={(val: Date) => {
                                                                            setDateValues((vals: jsonObj) => ({ ...vals, "DROP_DESTINATION_ADDRESS": val }))
                                                                        }} />
                                                                    <i className="fa fa-calendar"></i>
                                                                </div>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <div className="calendar_input time_input">
                                                                    <Form.Control type="time" required={true} placeholder="00:00" disabled={getMilestone("DROP_DESTINATION_ADDRESS")?.milestone_date ? true : false} value={timeValues["DROP_DESTINATION_ADDRESS"] ? timeValues["DROP_DESTINATION_ADDRESS"] : ""}
                                                                        onChange={(e) => {
                                                                            let val = e.target.value
                                                                            if (checkValidMilestoneTime("DROP_DESTINATION_ADDRESS", val)) {
                                                                                setTimeValues((vals: jsonObj) => ({ ...vals, "DROP_DESTINATION_ADDRESS": e.target.value }))
                                                                            }
                                                                        }} />
                                                                    <i className="fa fa-clock-o"></i>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                <div className="hr_line2"></div>
                                                <div className="milestone_bottom">
                                                    {
                                                        accountType == 'S' ?
                                                            <>
                                                                {
                                                                    getMilestone("DROP_DESTINATION_ADDRESS")?.is_completed == '1' ?
                                                                        <p style={{ color: "#2AC856" }}>
                                                                            <Image src="/images/green_check.svg" alt="" width={13} height={15} />
                                                                            <span className="ms-1">Marked as Done</span>
                                                                        </p>
                                                                        : ""
                                                                }
                                                            </>
                                                            :
                                                            <div className="chekinput milestonerow d-flex">
                                                                <Form.Check disabled={getMilestone("DROP_DESTINATION_ADDRESS")?.is_completed == '1' ? true : false} checked={getMilestone("DROP_DESTINATION_ADDRESS")?.is_completed == '1' ? true : false} className="login_hover" type="checkbox" id="final-1" onClick={(e) => {
                                                                    if (previousCompleted("DROP_DESTINATION_ADDRESS", e)) {
                                                                        markDone("DROP_DESTINATION_ADDRESS", e)
                                                                    }
                                                                }} />
                                                                <Form.Label htmlFor="final-1"> {getMilestone("DROP_DESTINATION_ADDRESS")?.is_completed == '1' ? "Marked" : "Mark"} as done </Form.Label>
                                                            </div>

                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    : ""
                            }
                        </div>
                    </div>
                    {
                        selector?.account_type == 'C' || (selector?.owner_account_type == 'C' && selector.permissions?.includes("invoice")) ? // carrier side invoice upload
                            <div className="col-md-12 text-center mb-4">
                                <div className="row">
                                    <div className="col-md-12">
                                        <button className="btn delivered_btn" disabled={deliverBtnDisable} onClick={() => setShowUploadProof(true)}>
                                            Delivered
                                        </button>
                                    </div>
                                </div>
                                <div className="row border-top mt-5">
                                    <div className="col md-12 my-4">
                                        {
                                            (data.invoice == null || (data.invoice && data.invoice.admin_delivery_approved == '2')) && showUploadProof && data.delivered_by_carrier == '0' ?
                                                // (data.delivered_by_carrier == '0' || data.admin_delivery_approved == '2') && showUploadProof  ?
                                                <>
                                                    <Form.Group>
                                                        <Form.Label>Upload delivery proof</Form.Label>
                                                        {
                                                            showUploadPODBtn() ?
                                                                <div className="imgprofile_box docinput" style={{ width: "60%" }}>
                                                                    <input type="file" multiple accept=".pdf, .doc, .docx, .jpg, .jpeg, .png" onChange={(e: jsonObj) => {
                                                                        let files = e.target.files
                                                                        let allowedFiles = 5
                                                                        if (PODFiles.length) {
                                                                            allowedFiles = allowedFiles - PODFiles.length
                                                                        }
                                                                        if (Array.isArray(data.shipmentDeliveryProof) && Array(data.shipmentDeliveryProof).length) {
                                                                            allowedFiles = allowedFiles - data.shipmentDeliveryProof.length
                                                                        }
                                                                        if (files.length > allowedFiles) {
                                                                            notify("warn", `Maximum ${allowedFiles} files can be uploaded.`)
                                                                            e.preventDefault()
                                                                            return false
                                                                        } else {
                                                                            let tempFiles = [...PODFiles]
                                                                            for (let index = 0; index < files.length; index++) {
                                                                                const element = files[index];
                                                                                if (checkDocfile(element)) {
                                                                                    tempFiles.push(element)
                                                                                } else {
                                                                                    notify("warn", "Please upload valid Image or Document.")
                                                                                }
                                                                            }
                                                                            setPODFiles(tempFiles)
                                                                        }
                                                                    }} />
                                                                    <span className="invoice-text"> <i className="fa fa-plus"></i> Upload Files</span>
                                                                </div>
                                                                : ""
                                                        }
                                                        <div className="mt-3">
                                                            { // uploaded files on change of input
                                                                PODFiles.length ?
                                                                    <>
                                                                        {
                                                                            PODFiles.map((file: File, index: number) => {
                                                                                return <div className="d-flex justify-content-between" key={'proof-' + index}>
                                                                                    <p className="pod-file-text">{file.name}</p>
                                                                                    <img src="/images/crossWithBg.svg" height="22px" className="c-pointer" onClick={() => removePODFile(index)} />
                                                                                </div>
                                                                            })
                                                                        }
                                                                    </>
                                                                    : ""
                                                            }
                                                            { // files from backend after upload POD.
                                                                data.shipmentDeliveryProof.length ?
                                                                    <>
                                                                        <span>Uploaded files</span>
                                                                        {showProofs(true)}
                                                                    </>
                                                                    : ""
                                                            }
                                                        </div>
                                                    </Form.Group>
                                                    <Form.Group className="my-4">
                                                        <Form.Label>Upload invoice</Form.Label>
                                                        <div className="imgprofile_box docinput" style={{ width: "60%" }}>
                                                            <input type="file" onClick={(e: jsonObj) => e.target.value = ''} onChange={(e: jsonObj) => {
                                                                let file = e.target.files[0]
                                                                if (file && checkDocfile(file)) {
                                                                    setInvoiceFile(file)
                                                                } else {
                                                                    notify("warn", "Please upload valid Image or Document.")
                                                                }
                                                            }} />
                                                            {
                                                                invoiceFile
                                                                    ?
                                                                    <span className="invoice-text">{invoiceFile.name}</span>
                                                                    :
                                                                    <span className="invoice-text"> <i className="fa fa-plus"></i> Upload File</span>
                                                            }
                                                        </div>
                                                        {
                                                            data.manual_invoice_path ?
                                                                manualInvoice()
                                                                : ""
                                                        }
                                                    </Form.Group>
                                                    {
                                                        data.mode?.slug == 'ocean'
                                                            ?
                                                            <Form.Group className="my-4">
                                                                <Form.Label>BL Number</Form.Label>
                                                                <Form.Control
                                                                    placeholder="Enter BL number"
                                                                    id="bl_number"
                                                                    value={blNumber}
                                                                    maxLength={10}
                                                                    onKeyDown={handleSpaceBar}
                                                                    onChange={(e) => {
                                                                        let val = e.target.value
                                                                        if (/^([a-zA-Z0-9]+)$/.test(val) || val == "") {
                                                                            setBlNumber(val)
                                                                        }
                                                                    }}
                                                                />
                                                            </Form.Group>
                                                            : ""
                                                    }
                                                    <Form.Group className="my-4">
                                                        <button type="button" className="btn cpn-bt px-5" onClick={() => {
                                                            if (!data.shipmentDeliveryProof?.length && !PODFiles.length) {
                                                                notify("warn", "Please upload a delivery proof.")
                                                            } else if (!invoiceFile && !data.manual_invoice_path) {
                                                                notify("warn", "Please upload invoice.")
                                                                return false
                                                            } else if (blNumber.trim() == "" && data.mode?.slug == 'ocean') {
                                                                notify("warn", "Please enter BL number.")
                                                            } else {
                                                                fireAlert(data.admin_delivery_approved == '2' ? "Are you sure you want to submit the files?" : "Are you sure you want to upload the documents?", "Submit").then(result => {
                                                                    if (result.isConfirmed) {
                                                                        submitFiles()
                                                                    }
                                                                })
                                                            }
                                                        }}>Submit</button>
                                                    </Form.Group>
                                                </>
                                                : data.delivered_by_carrier == '1' && !data.invoice && data.invoice?.is_invoice_final == '0' ?
                                                    <Form.Group className="py-3">
                                                        <span>Delivery proof and invoice uploaded.</span>
                                                        {showProofs()}
                                                        <Form.Group className="pt-3">
                                                            <a href={`${config.imageUrl}${data.manual_invoice_path}`} rel="noreferrer" target="_blank" className="pod-file-text">View uploaded invoice</a>
                                                        </Form.Group>
                                                    </Form.Group>
                                                    : ""
                                        }
                                        { // invoice btn and invoice
                                            (data.invoice == null && checkUncompletedMilestones().length == 0) || (data.invoice?.id && data.invoice?.admin_delivery_approved == '2') && data.invoice?.is_invoice_final == '0' ?
                                                <Form.Group>
                                                    <button type="button" className="btn verify-bt px-5" onClick={() => {
                                                        if (data.delivered_by_carrier == '1') {
                                                            router.push("/shipments/invoice/" + data.id)
                                                        } else {
                                                            notify("warn", "Please upload proof of delivery and invoice.")
                                                            return false
                                                        }
                                                    }}>
                                                        Invoice
                                                    </button>
                                                </Form.Group>
                                                : data.invoice && data.invoice?.admin_delivery_approved != '2' && data.invoice?.is_invoice_final == '0'
                                                    ?
                                                    <>
                                                        <Form.Group className="py-3">
                                                            <span>Invoice Acknowledged.</span>
                                                        </Form.Group>
                                                        {InvoiceBtn()}

                                                    </>
                                                    :
                                                    data.invoice?.is_invoice_final == '1' ?
                                                        <>
                                                            <Form.Group className="py-3">
                                                                <span>Invoice and Proof of delivery accepted.</span>
                                                            </Form.Group>
                                                            {showProofs(false)}
                                                            {manualInvoice()}
                                                            {InvoiceBtn()}
                                                        </>
                                                        : ""
                                        }

                                        { // delivery reject reason
                                            data.invoice?.admin_delivery_approved == '2' && data.invoice?.admin_delivery_reject_reason && data.delivered_by_carrier == '0' ?
                                                <>
                                                    <Form.Group className="py-3">
                                                        <p>Your invoice or Proof of delivery is rejected due to following reason.</p>
                                                        <p className="text-danger" style={{ wordBreak: "break-word" }}>{data.invoice.admin_delivery_reject_reason}</p>
                                                    </Form.Group>
                                                </>
                                                : ""
                                        }
                                    </div>
                                </div>
                            </div>
                            : // shipper side invoice view
                            <>
                                {
                                    data.invoice?.admin_delivery_approved == '1' && data.invoice?.shipper_delivery_approved != '2' && (selector?.account_type == 'S' || (selector?.owner_account_type == 'S' && selector.permissions?.includes("invoice"))) ?
                                        <div className="row border-top py-3">
                                            <div className="col-md-12">
                                                <Form.Group>
                                                    <p className="text-center">Proof of Delivery</p>
                                                    {showProofs()}
                                                </Form.Group>
                                                <Form.Group className="shipper-invoice-box col-7 mt-4">
                                                    {InvoiceBtn()}
                                                    {
                                                        data.invoice?.shipper_delivery_approved == '0' ?
                                                            <>
                                                                <button className="btn cpn-bt mb-3" onClick={() => {
                                                                    fireAlert("Are you sure you want to accept proof of delivery and invoice?", "Accept").then(result => {
                                                                        if (result.isConfirmed) {
                                                                            shipperInvoiceAction("1")
                                                                        }
                                                                    })
                                                                }}>Accept</button>
                                                                <button className="btn bg-danger verify-bt mb-4" onClick={() => setShowRejectShipper(true)}>Reject</button>
                                                            </>
                                                            : ""
                                                    }
                                                </Form.Group>
                                                {
                                                    showRejectShipper ?
                                                        <div className="shipper-invoice-box">
                                                            <Form.Group>
                                                                <Form.Control value={rejectReason} required={true} as="textarea" placeholder="Enter reject reason" rows={4} maxLength={300}
                                                                    onChange={(e: ChangeEvent<any>) => {
                                                                        let el = e.target as HTMLInputElement
                                                                        setRejectReason(el.value)
                                                                        setShowReasonError(false)
                                                                    }}
                                                                />
                                                                {
                                                                    showReasonError ?
                                                                        errDiv("Please enter rejection reason.")
                                                                        : ""
                                                                }
                                                            </Form.Group>
                                                            <Form.Group className="mx-auto mt-4 text-center">
                                                                <button type="submit" className="btn cpn-bt px-4"
                                                                    onClick={() => {
                                                                        if (rejectReason.trim().length) {
                                                                            fireAlert("Are you sure you want to reject proof of delivery and invoice?", "Reject").then(result => {
                                                                                if (result.isConfirmed) {
                                                                                    shipperInvoiceAction("2")
                                                                                }
                                                                            })
                                                                        } else {
                                                                            setShowReasonError(true)
                                                                        }
                                                                    }}
                                                                >Submit Reject</button>
                                                            </Form.Group>
                                                        </div>
                                                        : ""
                                                }
                                                {/* <Form.Group className="mt-3">
                                                    <label htmlFor="">Status: {data.shipper_delivery_approved == '1' ? "Accepted" : data.shipper_delivery_approved == '2' ? "Rejected" : "Pending"}</label>
                                                </Form.Group> */}
                                            </div>
                                        </div>
                                        : ""
                                }
                            </>
                    }
                </div>
            </div>

            {/* milestone add driver modal */}
            <Modal show={driverModal} backdrop="static" onHide={() => {
                setMultipleDrivers([])
                setDriverModal(false)
            }}>
                <Modal.Header closeButton>
                    <Modal.Title><h5>Assign Driver</h5></Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {
                        drivers.length ?
                            <>
                                <Table responsive hover striped>
                                    <thead>
                                        <tr>
                                            <th></th>
                                            <th>Driver Name</th>
                                            <th>Plate Number</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            drivers.map((d: jsonObj, index: number) => {
                                                return <tr key={'row-' + index}>
                                                    <td>
                                                        {
                                                            data.quantity > 1 ?
                                                                <input type="checkbox" id={"radio" + d.id} checked={multipleDrivers.includes(d.id as never)} onChange={() => {
                                                                    if (multipleDrivers.includes(d.id as never)) {
                                                                        setMultipleDrivers((driver) => (driver.filter((driver) => driver != d.id)))
                                                                    } else {
                                                                        if (multipleDrivers.length == data.quantity) {
                                                                            notify("warn", `You can only select ${data.quantity} drivers.`)
                                                                        } else {
                                                                            setMultipleDrivers(multipleDrivers.concat([d.id as never]))
                                                                        }
                                                                    }
                                                                }} />
                                                                :
                                                                <input type="radio" checked={d.id == driver?.id ? true : false} name="driver" id={"radio" + d.id} onClick={() => {
                                                                    setDriver(d)
                                                                }} />
                                                        }
                                                    </td>
                                                    <td><label htmlFor={"radio" + d.id}>{d.driver_name}</label></td>
                                                    <td><label htmlFor={"radio" + d.id}>{d.vehicle_number}</label></td>
                                                </tr>
                                            })
                                        }
                                    </tbody>
                                </Table>
                            </>
                            :
                            <div className="d-flex justify-content-center mt-3">
                                No driver found
                            </div>
                    }

                    {
                        totalPage > 1 ?
                            <div className="mt-3">
                                <CustomPagination activePage={activePage} count={totalPage}
                                    onChange={(p) => {
                                        setActivePage(p.selected)
                                    }}
                                />
                            </div>
                            : ""
                    }
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-evenly">
                    <button type="button" className="btn verify-bt" onClick={() => {
                        setDriverModal(false)
                        setMultipleDrivers([])
                    }}>Cancel</button>
                    <button type="button" className="btn cpn-bt" onClick={() => {
                        if (data.quantity > 1 && multipleDrivers.length < data.quantity) {
                            notify("warn", `Total ${data.quantity} drivers required.`)
                            return;
                        } else if (data.quantity == 1 && !driver?.id) {
                            notify("warn", "Please select a driver.")
                            return;
                        }
                        selectMilestoneDriver()
                    }}>Choose</button>
                </Modal.Footer>
            </Modal>

            <Modal show={driverAssignModal} onHide={() => {
                setAssignedDriversList([])
                setDriverAssignModal(false)
            }}>
                <Modal.Header closeButton>
                    <Modal.Title><h5>Assigned Driver List</h5></Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {
                        assignedDriversList.length ?
                            <>
                                <Table responsive hover striped>
                                    <thead>
                                        <tr>
                                            <th>Driver Name</th>
                                            <th>Plate Number</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            assignedDriversList.map((driver: jsonObj) => (
                                                <tr>
                                                    <td>{driver.driver_name}</td>
                                                    <td>{driver.vehicle_number}</td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </Table>
                            </>
                            : ""
                    }
                </Modal.Body>
            </Modal>

        </>
    )
}

export default Milestone