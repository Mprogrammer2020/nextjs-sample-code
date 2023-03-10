import Head from "next/head";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Addimg from "../public/images/add-document.svg";
import { Form, Modal, OverlayTrigger, Tooltip } from "react-bootstrap";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select";
import { userServices } from "../services/user.services";
import Loader from "./Loader";
import toast from "./Toast";
import { useRouter } from "next/router";
import moment from "moment-timezone";
import { checkDocfile, fieldsShow, floatValidation, jsonObj, setDateFormat, validateShipment } from "../helpers/validation";
import { errDiv } from "../helpers/dropdown";
import AddressCity from "./Shipment/AddressCity";
import { config } from "../config/config";
import { SelectField } from "./Shipment/InputFields";
import { useAppSelector } from "../rtk/hooks";
import { AddressList } from "./Shipment/AddressList";
import { DateField } from "./Shipment/DateField";
import { shipmentServices } from "../services/shipment.services";
import Script from "next/script"

const AddShipment = () => {
    const regExPositiveInt = /^\d+$/;

    const LandPortOptions = [
        { value: "I", label: "Import" },
        { value: "E", label: "Export" },
    ]

    const totalvolumeoption = [{ value: "CBM", label: "CBM" }]
    const cargoweightOptions = [
        { value: "kg", label: "Kg" },
        { value: "tons", label: "TONS" },
    ]
    const cargoDimensionOptions = [
        { value: "cm", label: "CM" },
        { value: "in", label: "IN" },
        { value: "m", label: "M" },
        { value: "mm", label: "MM" },
    ]
    const timeoptions = [
        { value: "14", label: "14" },
        { value: "21", label: "21" },
    ]

    const [shipmentOptions, setShipmentOptions] = useState<any>([{}]);
    const [movementOptions, setMovementOptions] = useState<any>([{}]);
    const [shipmentData, setShipmentData] = useState<jsonObj>({})
    const [values, setValues] = useState<jsonObj>({})
    const [pickupDTOriginAddressDate, setPickupDTOriginAddressDate] = useState(new Date) // DT = DateTime
    const [pickupDTOriginAddressTime, setPickupDTOriginAddressTime] = useState("")
    const [pickupDTDestinationPortDate, setPickupDTDestinationPortDate] = useState(new Date)
    const [pickupDTDestinationPortTime, setPickupDTDestinationPortTime] = useState("")
    const [deliveryDTOriginportDate, setDeliveryDTOriginPortDate] = useState(new Date)
    const [deliveryDTOriginportTime, setDeliveryDTOriginportTime] = useState("")
    const [deliveryDTDestinationAddressDate, setDeliveryDTDestinationAddressDate] = useState(new Date)
    const [deliveryDTDestinationAddressTime, setDeliveryDTDestinationAddressTime] = useState("")
    const [next, set_next] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isLandPort, setIsLandPort] = useState(false);
    const [isDGCDoc, setIsDGCDoc] = useState("N");
    const [DGCDoc, setDGCDoc] = useState("") as any
    const [packingListDoc, setPackingListDoc] = useState<any>();
    const [originCities, setOriginCities] = useState<Array<any>>([])
    const [destCities, setDestCities] = useState<Array<any>>([])
    const [reuse, setReuse] = useState(0)
    const [errors, setErrors] = useState<jsonObj>({})
    const [isDimension, setIsDimension] = useState("0")
    const cargoLWH = useRef({ length: "", width: "", height: "", unit: "" }) as jsonObj
    const [addedData, setAddedData] = useState<jsonObj>({})
    const [showAddress, setShowAddress] = useState(false)
    const [createLandShipment, setCreatelandShipment] = useState(false);
    const [addressType, setAddressType] = useState("")
    const [chooseOriginAddress, setChooseOriginAddress] = useState<jsonObj>({})
    const [chooseDestAddress, setChooseDestAddress] = useState<jsonObj>({})
    const [addresses, setAddresses] = useState(0)
    const [originAddressPage, setOriginAddressPage] = useState(0)
    const [destAddressPage, setDestAddressPage] = useState(0)
    const [filterSavedAddress, setFilterSavedAddress] = useState("")

    const notify = useCallback((type, message) => {
        toast.dismiss()
        toast({ type, message });
    }, []);

    const router = useRouter()
    const shipment_id = router.query.id
    const reopen = router.query.reopen

    const customStyles = {
        option: (base: any, state: any) => {
            let color = "#7C888E";
            let backgroundColor = "transparent";
            if (state.isSelected) {
                color = "#081539";
                backgroundColor = "transparent";
            }
            if (state.isFocused) {
                color = "#081539";
                backgroundColor = "transparent";
            }
            return { ...base, color, backgroundColor };
        },
    }

    const selector = useAppSelector((state) => state.profile.profile_data);

    useEffect(() => {
        if (typeof window != 'undefined') {
            setLoading(true)
            if (selector && (selector.admin_verified != '1' || selector.account_type == 'C' || selector.owner_account_type == 'C')) {
                router.push("/dashboard")
            }
            userServices.getShipmentData().then(resp => {
                let sData = resp.data
                for (let index = 0; index < sData.portList.length; index++) {
                    const port = sData.portList[index];
                    port.port_name = `${port.name} (${port.code})`
                }
                setShipmentData(resp.data)
                if (shipment_id) { // if shipment id in URL , then add shipment is treated as update/edit.
                    setLoading(true)
                    shipmentServices.shipmentDetails(shipment_id).then(response => {
                        let tempData = response.data.shipmentDetails
                        if (tempData.status != '0' && !reopen) {
                            notify("warn", "Editing shipment not allowed.")
                            router.push("/shipments")
                        }
                        setLoading(false)
                        set_next(true)
                        let vals = {} as jsonObj
                        setAddedData(response.data.shipmentDetails)
                        setShipmentOptions(resp.data.shipmentTypeData.filter((d: any) => d.mode == tempData.mode.id))
                        setMovementOptions(resp.data.movementTypeData.filter((d: any) => d.mode_id == tempData.mode.id))
                        vals.mode = tempData.mode
                        vals.shipment = tempData.shipShipmentType
                        if (tempData.shipShipmentType.slug == 'port') {
                            setIsLandPort(true)
                            vals.flow = LandPortOptions.filter((v: any) => v.value == tempData.flow)[0].value
                        }
                        vals.movement = tempData.movementType
                        vals.additionalComments = tempData.additional_comments
                        setIsDGCDoc(tempData.dgs)
                        if (tempData.cargo_readiness_date && !reopen) {
                            vals.cargoReadinessDate = new Date(tempData.cargo_readiness_date)
                        }
                        if (tempData.cargo_dimension) {
                            if (tempData.is_dimension == '1') {
                                let LWH = tempData.cargo_dimension.split("x")
                                cargoLWH.current = { length: LWH[0], width: LWH[1], height: LWH[2], unit: LWH[3] }
                                setIsDimension("1")
                            } else {
                                vals.volume = tempData.cargo_dimension
                            }
                        }
                        if (tempData.truckType) {
                            vals.truckType = tempData.truckType
                        }
                        if (tempData.containerType) {
                            vals.containerType = tempData.containerType
                        }
                        if (tempData.quantity) {
                            vals.quantity = tempData.quantity
                        }
                        if (tempData.cargo_weight) {
                            vals.cargoWeight = tempData.cargo_weight
                            if (tempData.cargo_weight_unit) {
                                vals.cargoWeightUnit = cargoweightOptions.filter((op: jsonObj) => op.value == tempData.cargo_weight_unit)[0].value
                            }
                        }
                        if (tempData.portDischarge?.id) {
                            let tempDisPort = { ...tempData.portDischarge, port_name: `${tempData.portDischarge.name} (${tempData.portDischarge.code})` }
                            vals.portDischarge = tempDisPort
                        }
                        if (tempData.portLoading?.id) {
                            let tempLoadPort = { ...tempData.portLoading, port_name: `${tempData.portLoading.name} (${tempData.portLoading.code})` }
                            vals.loadingPort = tempLoadPort
                        }

                        if (tempData.commodity) {
                            vals.selectedCommodity = tempData.commodity
                        }
                        if (tempData.originPort?.id) {
                            let tempOriginPort = { ...tempData.originPort, port_name: `${tempData.originPort.name} (${tempData.originPort.code})` }
                            vals.originPort = tempOriginPort
                        }
                        if (tempData.destinationPort?.id) {
                            let tempDestPort = { ...tempData.destinationPort, port_name: `${tempData.destinationPort.name} (${tempData.destinationPort.code})` }
                            vals.destinationPort = tempDestPort
                        }
                        if (tempData.free_time_origin) {
                            vals.freeTimeOrigin = tempData.free_time_origin
                        }
                        if (tempData.free_time_destination) {
                            vals.freeTimeDest = tempData.free_time_destination
                        }
                        if (tempData.movementType.slug == 'local') {
                            userServices.cities(tempData.originCountry.id, "").then(resp => {
                                setOriginCities(resp.data)
                                setDestCities(resp.data)
                            })
                        }
                        if (tempData.originCountry?.id) {
                            vals.originCountry = tempData.originCountry
                            handleChangeCountry("O", tempData.originCountry.id, tempData.originCity)
                        }
                        if (tempData.originCity?.id) {
                            vals.originCity = tempData.originCity
                        }
                        if (tempData.origin_address) {
                            vals.originAddress = tempData.origin_address
                            vals.origin_place_id = tempData.origin_place_id
                        }
                        if (tempData.destinationCountry?.id) {
                            handleChangeCountry("D", tempData.destinationCountry.id, tempData.destinationCity)
                            vals.destinationCountry = tempData.destinationCountry
                        }
                        if (tempData.destinationCity?.id) {
                            vals.destinationCity = tempData.destinationCity
                        }
                        if (tempData.destination_address) {
                            vals.destinationAddress = tempData.destination_address
                            vals.destination_place_id = tempData.destination_place_id
                        }
                        if (tempData.pickup_date_and_time_origin_address && !reopen) {
                            var dt = moment(new Date(tempData.pickup_date_and_time_origin_address)).tz("Asia/Dubai").format("YYYY/MM/DD HH:mm").split(" ")
                            setPickupDTOriginAddressDate(new Date(dt[0]))
                            setPickupDTOriginAddressTime(dt[1])
                        }
                        if (tempData.delivery_date_and_time_origin_port && !reopen) {
                            var dt = moment(new Date(tempData.delivery_date_and_time_origin_port)).tz("Asia/Dubai").format("YYYY/MM/DD HH:mm").split(" ")
                            setDeliveryDTOriginPortDate(new Date(dt[0]))
                            setDeliveryDTOriginportTime(dt[1])
                        }
                        if (tempData.pickup_date_and_time_destination_port && !reopen) {
                            var dt = moment(new Date(tempData.pickup_date_and_time_destination_port)).tz("Asia/Dubai").format("YYYY/MM/DD HH:mm").split(" ")
                            setPickupDTDestinationPortDate(new Date(dt[0]))
                            setPickupDTDestinationPortTime(dt[1])
                        }
                        if (tempData.delivery_date_and_time_destination_address && !reopen) {
                            var dt = moment(new Date(tempData.delivery_date_and_time_destination_address)).tz("Asia/Dubai").format("YYYY/MM/DD HH:mm").split(" ")
                            setDeliveryDTDestinationAddressDate(new Date(dt[0]))
                            setDeliveryDTDestinationAddressTime(dt[1])
                        }
                        setValues(vals)
                        setLoading(false)
                    }).catch(err => {
                        setLoading(false)
                    })
                } else {
                    setLoading(false)
                }
            }).catch(err => {
                setLoading(false)
            })
        }
    }, [shipment_id, selector])

    useEffect(() => {
        shipmentServices.savedAddresses().then(resp => {
            setAddresses(resp.data?.totalRecords ? resp.data.totalRecords : 0)
        }).catch(err => console.error(err))
    }, [selector])

    function handleModeType(e: any) { // handle shipment mode change
        setValues((vals: jsonObj) => ({ ...vals, mode: e, shipment: {}, movement: {}, flow: "" }))
        setShipmentOptions(shipmentData.shipmentTypeData.filter((d: any) => d.mode == e.id))
        setMovementOptions(shipmentData.movementTypeData.filter((d: any) => d.mode == e.id))
        setErrors((err: jsonObj) => ({ ...err, selectedMode: "" }))
    }

    function handleLandisPort() { // function to handle if land is port, then show ocean movement options
        setIsLandPort(true)
        let ocean_mode_id = shipmentData.modes.filter((s: any) => s.slug == 'ocean')[0].id
        setMovementOptions(shipmentData.movementTypeData.filter((m: any) => m.mode_id == ocean_mode_id))
        setValues((vals: jsonObj) => ({ ...vals, movement: {}, flow: "" }))
    }

    function validateForm() { // validate all field values
        let partialValidate = validateShipment(values)
        let success = partialValidate.success
        let err = partialValidate.errors
        if (fieldsShow(values).attachPackage && !packingListDoc && values.movement?.slug != 'bulk') {
            success = false
            err.packingListDoc = 'Please attach packing list.'
        }
        if (fieldsShow(values).dimensions) {
            if (isDimension == '1') {
                if (!cargoLWH.current.width || !cargoLWH.current.length || !cargoLWH.current.height) {
                    success = false
                    err.cargoDimension = 'Please enter correct dimensions.'
                }
            } else if (fieldsShow(values).dimensions && !values.volume) {
                err.cargoDimension = 'Please enter volume.'
                success = false
            }
        }
        if (isDGCDoc == 'Y' && !DGCDoc && !shipment_id) {
            err.DGCDoc = 'Please attach document.'
            success = false
        }
        if (fieldsShow(values).timeOriginAddress) {
            if (!pickupDTOriginAddressDate) {
                err.pickupDTOriginAddressDate = 'Please select date.'
                success = false
            }
            if (!pickupDTOriginAddressTime) {
                err.pickupDTOriginAddressTime = 'Please select Time.'
                success = false
            }
        }
        if (fieldsShow(values).timeDestPort) {
            if (!pickupDTDestinationPortDate) {
                err.pickupDTDestinationPortDate = 'Please select date.'
                success = false
            }
            if (!pickupDTDestinationPortTime) {
                err.pickupDTDestinationPortTime = 'Please select Time.'
                success = false
            }
        }
        if (fieldsShow(values).timeOriginPort) {
            if (!deliveryDTOriginportDate) {
                err.deliveryDTOriginportDate = 'Please select date.'
                success = false
            }
            if (!deliveryDTOriginportTime) {
                err.deliveryDTOriginportTime = 'Please select Time.'
                success = false
            }
        }
        if (fieldsShow(values).timeDestAddress) {
            if (!deliveryDTDestinationAddressDate) {
                err.deliveryDTDestinationAddressDate = 'Please select date.'
                success = false
            }
            if (!deliveryDTDestinationAddressTime) {
                err.deliveryDTDestinationAddressTime = 'Please select time.'
                success = false
            }
        }
        if (fieldsShow(values).timeDestPort && fieldsShow(values).timeDestAddress) { // p to d
            let dt1 = new Date(`${moment(pickupDTDestinationPortDate).format('YYYY-MM-DD')} ${pickupDTDestinationPortTime}`)
            let dt2 = new Date(`${moment(deliveryDTDestinationAddressDate).format('YYYY-MM-DD')} ${deliveryDTDestinationAddressTime}`)
            if (dt1 >= dt2) {
                err.deliveryDTDestinationAddressDate = 'Delivery Date/Time must be greater than pickup Date/Time'
                success = false
            }
        }

        if (fieldsShow(values).timeOriginAddress && fieldsShow(values).timeOriginPort) { // d to p
            let dt1 = new Date(`${moment(pickupDTOriginAddressDate).format('YYYY-MM-DD')} ${pickupDTOriginAddressTime}`)
            let dt2 = new Date(`${moment(deliveryDTOriginportDate).format('YYYY-MM-DD')} ${deliveryDTOriginportTime}`)
            if (dt1 >= dt2) {
                err.deliveryDTOriginportDate = 'Delivery Date/Time must be greater than pickup Date/Time'
                success = false
            }
        }

        if (fieldsShow(values).timeOriginPort && fieldsShow(values).timeDestPort && deliveryDTOriginportTime && pickupDTDestinationPortTime) {
            let dt1 = new Date(`${moment(deliveryDTOriginportDate).format('YYYY-MM-DD')} ${deliveryDTOriginportTime}`)
            let dt2 = new Date(`${moment(pickupDTDestinationPortDate).format('YYYY-MM-DD')} ${pickupDTDestinationPortTime}`)
            if (dt1 >= dt2) {
                err.pickupDTDestinationPortDate = 'Pickup Date/Time must be greater than delivery Date/Time Origin Port'
                success = false
            }
        }

        if (fieldsShow(values).timeOriginAddress && fieldsShow(values).timeDestAddress && pickupDTOriginAddressTime && deliveryDTDestinationAddressTime) {
            let dt1 = new Date(`${moment(pickupDTOriginAddressDate).format('YYYY-MM-DD')} ${pickupDTOriginAddressTime}`)
            let dt2 = new Date(`${moment(deliveryDTDestinationAddressDate).format('YYYY-MM-DD')} ${deliveryDTDestinationAddressTime}`)
            if (dt1 >= dt2) {
                err.deliveryDTDestinationAddressDate = 'Delivery Date/Time must be greater than pickup Date/Time'
                success = false
            }
        }

        if (fieldsShow(values).timeOriginAddress && fieldsShow(values).timeDestAddress && fieldsShow(values).timeOriginPort && deliveryDTOriginportTime && deliveryDTDestinationAddressTime) {
            if (pickupDTOriginAddressDate && pickupDTOriginAddressTime && deliveryDTDestinationAddressDate && deliveryDTDestinationAddressTime) {
                let dt1 = new Date(`${moment(deliveryDTOriginportDate).format('YYYY-MM-DD')} ${deliveryDTOriginportTime}`)
                let dt2 = new Date(`${moment(deliveryDTDestinationAddressDate).format('YYYY-MM-DD')} ${deliveryDTDestinationAddressTime}`)
                if (dt1 >= dt2) {
                    err.deliveryDTDestinationAddressDate = 'Delivery Date/Time must be greater than pickup Date/Time'
                    success = false
                }
            }
        }
        setErrors(err)
        return success
    }

    function formParams() { // generate form params for shipment
        let formData = new FormData() as any
        formData.append("mode", values.mode.id)
        formData.append("shipment_type_id", values.shipment.id)
        formData.append("movement_type", values.movement.id)
        if (reopen) {
            formData.append("reopen", "1")
        }
        formData.append("dgs", isDGCDoc)
        if (isDGCDoc == 'Y') {
            formData.append("dgs_doc", DGCDoc)
        }
        formData.append("free_time_origin", values.freeTimeOrigin ? values.freeTimeOrigin : "0")
        formData.append("free_time_destination", values.freeTimeDest ? values.freeTimeDest : "0")
        formData.append("container_type", values.containerType?.id ? values.containerType.id : "0")
        formData.append("truck_type", values.truckType?.id ? values.truckType.id : "0")
        if (fieldsShow(values).originCountry) {
            formData.append("origin_country", values.originCountry?.id ? values.originCountry.id : "0")
            if (values.shipment.slug == 'local') {
                formData.append("destination_country", values.originCountry?.id ? values.originCountry.id : "0")
            }
        }
        if (fieldsShow(values).originDestPort) {
            formData.append("origin_port", values.originPort?.id ? values.originPort.id : "0")
            formData.append("destination_port", values.destinationPort?.id ? values.destinationPort.id : "0")
        }
        if (fieldsShow(values).originAddressCity) {
            formData.append("origin_city", values.originCity?.id ? values.originCity.id : "0")
            formData.append("origin_address", values.originAddress)
            formData.append("origin_place_id", values.origin_place_id)
        }
        if (fieldsShow(values).destCountry) {
            formData.append("destination_country", values.destinationCountry?.id ? values.destinationCountry.id : "0")
        }
        if (fieldsShow(values).destAddressCity) {
            formData.append("destination_city", values.destinationCity?.id ? values.destinationCity.id : "0")
            formData.append("destination_address", values.destinationAddress)
            formData.append("destination_place_id", values.destination_place_id)
        }
        formData.append("is_dimension", isDimension)

        if (values.selectedCommodity) {
            formData.append("commodity", values.selectedCommodity)
        }
        if (values.flow) {
            formData.append("flow", values.flow)
        }

        if (values.quantity) {
            formData.append("quantity", values.quantity)
        }
        if (fieldsShow(values).dimensions) {
            if (isDimension == "1") {
                let lwh = `${cargoLWH.current.length}x${cargoLWH.current.width}x${cargoLWH.current.height}x${cargoLWH.current.unit}`
                formData.append("cargo_dimension", lwh)
            } else {
                formData.append("cargo_dimension", values.volume)
            }
        }
        if (values.cargoWeight) {
            formData.append("cargo_weight", values.cargoWeight)
            if (values.cargoWeightUnit) {
                formData.append("cargo_weight_unit", values.cargoWeightUnit)
            }
        }
        if (packingListDoc) {
            formData.append("attach_packing_list", packingListDoc)
        }

        if (pickupDTOriginAddressDate && pickupDTOriginAddressTime != '') {
            let dt = `${setDateFormat(pickupDTOriginAddressDate)} ${pickupDTOriginAddressTime}`
            formData.append("pickup_date_and_time_origin_address", dt)
        }
        if (pickupDTDestinationPortDate && pickupDTDestinationPortTime != '') {
            let dt = `${setDateFormat(pickupDTDestinationPortDate)} ${pickupDTDestinationPortTime}`
            formData.append("pickup_date_and_time_destination_port", dt)
        }
        if (deliveryDTOriginportDate && deliveryDTOriginportTime != '') {
            let dt = `${setDateFormat(deliveryDTOriginportDate)} ${deliveryDTOriginportTime}`
            formData.append("delivery_date_and_time_origin_port", dt)
        }
        if (deliveryDTDestinationAddressDate && deliveryDTDestinationAddressTime != '') {
            let dt = `${setDateFormat(deliveryDTDestinationAddressDate)} ${deliveryDTDestinationAddressTime}`
            formData.append("delivery_date_and_time_destination_address", dt)
        }
        if (values.cargoReadinessDate) {
            formData.append("cargo_readiness_date", `${setDateFormat(values.cargoReadinessDate)}`)
        }

        if (values.additionalComments?.length) {
            formData.append("additional_comments", values.additionalComments)
        }
        if (values.portDischarge?.id) {
            formData.append("port_discharge", values.portDischarge?.id)
        }
        if (values.loadingPort?.id) {
            formData.append("port_loading", values.loadingPort?.id)
        }
        return formData
    }

    function handleNumberKeyPress(event: jsonObj) { // handle only numbers in input field
        if (!/[0-9]/.test(event.key)) {
            event.preventDefault();
        }
    }

    function handleAddShipment(e: any) { // add/update api for shipment
        e.preventDefault();
        if (validateForm()) {
            setLoading(true)
            if (shipment_id) {
                shipmentServices.updateShipment(shipment_id, formParams()).then(resp => {
                    notify("success", `Shipment ${reopen ? "reopend" : "updated"} successfully.`)
                    setLoading(false)
                    router.push("/shipments")
                }).catch(err => {
                    setLoading(false)
                    if (err.response?.status == 401) {
                        router.push("/login")
                    }
                    if (err.response?.status == 400) {
                        if (err.response?.data?.message) {
                            notify("error", err.response.data.message)
                        } else {
                            notify("error", "Please fill required fields.")
                        }
                    } else if (err.response?.status == 403) {
                        notify("warn", err.response.data.message)
                    } else {
                        notify("error", "An error occured. Please try again later.")
                    }
                })
            } else {
                shipmentServices.addShipment(formParams()).then(resp => {
                    if (values.mode.id == 1) {
                        handleClearAfterOceanMode();
                        notify("success", "Shipment added successfully")
                        setLoading(false)
                        setCreatelandShipment(true);
                    } else {
                        notify("success", "Shipment added successfully.")
                        setLoading(false)
                        router.push("/shipments")
                    }
                }).catch(err => {
                    setLoading(false)
                    if (err.response?.status == 401) {
                        router.push("/login")
                    }
                    if (err.response?.status == 400) {
                        if (err.response?.data?.message) {
                            notify("error", err.response.data.message)
                        } else {
                            notify("error", "Please fill required fields.")
                        }
                    } else if (err.response?.status == 403) {
                        notify("warn", err.response.data.message)
                    } else {
                        notify("error", "An error occured. Please try again later.")
                    }
                })
            }

        } else {
            setTimeout(() => {
                let el = document.getElementsByClassName("error-div") as HTMLCollection
                if (el[0]) {
                    el[0].scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                        inline: "nearest",
                    });
                }
            }, 500);
            notify("warn", "Please correct errors.")
        }
    }

    function handleClearAfterOceanMode() { // clear all field values on ocean mode, shipment, movement change
        console.log(values);
        set_next(false)
        shipmentServices.shipmentTypeByMode(2).then((resp: { data: any; }) => {
            setShipmentOptions(resp.data);
        })
        setValues((val: jsonObj) => ({ mode: { id: 2, name: 'Land', slug: 'land' } }))
        setPickupDTOriginAddressDate(new Date)
        setPickupDTOriginAddressTime("")
        setPickupDTDestinationPortDate(new Date)
        setPickupDTDestinationPortTime("")
        setDeliveryDTOriginPortDate(new Date)
        setDeliveryDTOriginportTime("")
        setDeliveryDTDestinationAddressDate(new Date)
        setDeliveryDTDestinationAddressTime("")
        setIsDGCDoc("N")
        setDGCDoc("")
        setPackingListDoc("")
        setOriginCities([])
        setDestCities([])
    }

    function handleClear() { // clear all field values on mode, shipment, movement change
        setValues((val: jsonObj) => ({ mode: val.mode, shipment: val.shipment, movement: val.movement, flow: val.flow }))
        setPickupDTOriginAddressDate(new Date)
        setPickupDTOriginAddressTime("")
        setPickupDTDestinationPortDate(new Date)
        setPickupDTDestinationPortTime("")
        setDeliveryDTOriginPortDate(new Date)
        setDeliveryDTOriginportTime("")
        setDeliveryDTDestinationAddressDate(new Date)
        setDeliveryDTDestinationAddressTime("")
        setIsDGCDoc("N")
        setDGCDoc("")
        setPackingListDoc("")
        setOriginCities([])
        setDestCities([])
    }
    const OriginAddressProps = { AddressLabel: "Origin Address", CityLabel: "Origin City", address: "originAddress", city: "originCity", cities: originCities, country: values.originCountry, errors: errors, selectedMode: values?.mode, shipmentMode: values?.shipment, setCities: setOriginCities, setErrors: setErrors, type: "o", setValues: setValues, values: values }

    const DestAddressProps = { AddressLabel: "Destination Address", CityLabel: "Destination City", address: "destinationAddress", city: "destinationCity", cities: destCities, country: values.shipment?.slug == 'local' ? values.originCountry : values.destinationCountry, errors: errors, selectedMode: values?.mode, shipmentMode: values?.shipment, setCities: setDestCities, setErrors: setErrors, type: "d", setValues: setValues, values: values }

    function handleNext() { // handle 1st step handle of form
        let success = true
        let err = {} as jsonObj
        if (!values.mode?.slug) {
            err.selectedMode = 'Please select a mode.'
            success = false
        }
        if (!values.shipment?.slug) {
            err.shipmentMode = 'Please select shipment type.'
            success = false
        }
        if (!values.movement?.slug) {
            err.movementType = 'Please select movement type.'
            success = false
        }
        if (values.shipment?.slug == 'port') {
            if (!values.flow) {
                err.landPortFlow = 'Please select flow type.'
                success = false
            }
        }
        setErrors(err)
        return success
    }

    function handleChangeCountry(type: string, country_id: string | number, selected: jsonObj) {// function to handle chnage country and add cities options accordingly to fields
        setLoading(true)
        userServices.cities(country_id, "")
            .then(resp => {
                setLoading(false)
                let data = [...resp.data]
                if (selected?.id && !data.find((c: jsonObj) => c.id == selected.id)?.id) {
                    data.push(selected)
                }
                if (type == 'D') {
                    setDestCities(data)
                } else {
                    setOriginCities(data)
                }
            }).catch(err => {
                setLoading(false)
            })
    }

    function handleAddressSelect() { // handle address select from saved address
        if (addressType == 'O' && Object.keys(chooseOriginAddress).length != 0) {
            setValues((val: jsonObj) => ({ ...val, originCountry: chooseOriginAddress?.addressCountry, originCity: chooseOriginAddress?.addressCity?.id ? chooseOriginAddress.addressCity : "", originPort: chooseOriginAddress?.addressPort?.id ? chooseOriginAddress.addressPort : "", originAddress: chooseOriginAddress.address_location, origin_place_id: chooseOriginAddress.address_google_id }))
            handleChangeCountry(addressType, chooseOriginAddress.addressCountry.id, chooseOriginAddress.addressCity)
            setShowAddress(false)
        } else if (addressType == 'D' && Object.keys(chooseDestAddress).length != 0) {
            setValues((val: jsonObj) => ({ ...val, destinationCountry: chooseDestAddress?.addressCountry, destinationCity: chooseDestAddress?.addressCity?.id ? chooseDestAddress.addressCity : "", destinationPort: chooseDestAddress?.addressPort?.id ? chooseDestAddress.addressPort : "", destinationAddress: chooseDestAddress.address_location, destination_place_id: chooseDestAddress.address_google_id }))
            handleChangeCountry(addressType, chooseDestAddress.addressCountry.id, chooseDestAddress.addressCity)
            setShowAddress(false)
        } else {
            notify("warn", "Please select a address.")
        }
    }

    return (
        <div>
            <Head>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
                />
            </Head>
            <Script async src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCAbVUt8DKBTdMev8EHYiN7OK8hMQ0wKxI&libraries=places" />
            <section className="bg-grey py-5 editprofile_section">
                {loading && <Loader />}
                <div className="container">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="white_bg py-5">
                                <div className="text-center">
                                    <h2 className="form_heading">{reopen ? "Reopen" : shipment_id ? "Edit" : "Add"} Shipment</h2>
                                    {
                                        !shipment_id && (
                                            <p className="form_sub_heading mb-5"></p>
                                        )
                                    }
                                </div>
                                <div className="inner_form mt-4 edit-profile-box">
                                    <div className="frominput">
                                        <Form>
                                            <div className="row">
                                                <div className="col-md-6 mt-3">
                                                    <SelectField label="Mode" required={true} value={values.mode?.id ? values.mode : ""} options={shipmentData.modes} onChange={(e: any) => {
                                                        handleModeType(e)
                                                        handleClear()
                                                        setChooseOriginAddress({})
                                                        setChooseDestAddress({})
                                                        setErrors((err: jsonObj) => ({ ...err, selectedMode: "" }))
                                                    }}
                                                        getOptionLabel={(op: jsonObj) => op.name}
                                                        getOptionValue={(op: jsonObj) => op.id}
                                                    />
                                                    {
                                                        errors.selectedMode ? errDiv(errors.selectedMode) : ""
                                                    }
                                                </div>
                                                <div className="col-md-6 mt-3">
                                                    <SelectField label="Shipment" required={true} value={values.shipment?.id ? values.shipment : ""} options={shipmentOptions} onChange={(e: any) => {
                                                        setValues((vals: jsonObj) => ({ ...vals, shipment: e }))
                                                        setErrors({})
                                                        setChooseOriginAddress({})
                                                        setChooseDestAddress({})
                                                        if (e.name == 'Port') {
                                                            handleLandisPort()
                                                        } else {
                                                            setIsLandPort(false)
                                                            setMovementOptions(shipmentData.movementTypeData.filter((m: any) => m.mode_id == values.mode?.id))
                                                            setValues((val: jsonObj) => ({ ...val, movement: {} }))
                                                            handleClear()
                                                        }
                                                    }}
                                                        getOptionLabel={(op: jsonObj) => op.name}
                                                        getOptionValue={(op: jsonObj) => op.id}
                                                    />
                                                    {errors.shipmentMode ? errDiv(errors.shipmentMode) : ""}
                                                </div>
                                                <div className={isLandPort ? "col-md-6 mt-3" : "col-md-12  mt-3"}>
                                                    <SelectField label="Movement" required={true} value={values.movement?.id ? values.movement : ""} options={movementOptions} onChange={(e: any) => {
                                                        setValues((val: jsonObj) => ({ ...val, movement: e, flow: "" }))
                                                        handleClear()
                                                        setErrors({})
                                                    }}
                                                        getOptionLabel={(op: jsonObj) => op.name}
                                                        getOptionValue={(op: jsonObj) => op.id}
                                                    />
                                                    {
                                                        errors.movementType ? errDiv(errors.movementType) : ""
                                                    }
                                                </div>
                                                {isLandPort && (
                                                    <div className="col-md-6 mb-0  mt-3">
                                                        <SelectField label="Flow" required={true} value={values.flow ? LandPortOptions.find((op: any) => op.value == values.flow) : ""} options={LandPortOptions}
                                                            onChange={(e: any) => {
                                                                setValues((val: jsonObj) => ({ ...val, flow: e.value }))
                                                                handleClear()
                                                                setErrors({})
                                                            }}
                                                        />
                                                        {errors.landPortFlow ? errDiv(errors.landPortFlow) : ""}
                                                    </div>
                                                )}

                                                {!next && (
                                                    <div className="col-md-12 next_btn text-center">
                                                        <button type="button" className="btn my-4" onClick={(e: any) => {
                                                            if (handleNext()) {
                                                                set_next(true)
                                                            }
                                                        }}
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                )}


                                            </div>
                                            {/* //change later */}

                                            {next && (
                                                <div className="row" >
                                                    <div id="row1"></div>
                                                    {
                                                        fieldsShow(values).containerType && (
                                                            <div className="col-md-6 pb-3">
                                                                <SelectField required={true} onKeyDown={(e: any) => e.preventDefault()} label="Container Type" value={values.containerType?.id ? values.containerType : ""} options={shipmentData.containerList} getOptionValue={(op: any) => op.id} getOptionLabel={(op: any) => op.name}
                                                                    onChange={(e: jsonObj) => {
                                                                        setValues((val: jsonObj) => ({ ...val, containerType: e, truckType: {} }))
                                                                        setErrors((err: jsonObj) => ({ ...err, containerType: "" }))
                                                                    }}
                                                                />
                                                                {errors.containerType && errDiv(errors.containerType)}
                                                            </div>
                                                        )
                                                    }

                                                    {
                                                        fieldsShow(values).truckType && (
                                                            <div className="col-md-6 pb-3">
                                                                <SelectField required={true} onKeyDown={(e: any) => e.preventDefault()} label="Truck Type" value={values.truckType?.id ? values.truckType : ""} options={shipmentData.truckType} getOptionValue={(op: any) => op.id} getOptionLabel={(op: any) => op.name}
                                                                    onChange={(e: jsonObj) => {
                                                                        setValues((val: jsonObj) => ({ ...val, containerType: {}, truckType: e }))
                                                                        setErrors((err: jsonObj) => ({ ...err, containerType: "" }))
                                                                    }}
                                                                />
                                                                {errors.truckType && errDiv(errors.truckType)}
                                                            </div>
                                                        )
                                                    }

                                                    {
                                                        fieldsShow(values).quantity && (
                                                            <div className="col-md-6 pb-3">
                                                                <Form.Group className="" controlId="formBasicEmail">
                                                                    <Form.Label>Quantity<span className="required field">*</span></Form.Label>
                                                                    <input min={1} type="number" className="country-select-box" value={values.quantity ? values.quantity : ""} placeholder="Enter quantity" onChange={(e: any) => {
                                                                        let value = e.target.value
                                                                        if (regExPositiveInt.test(value) || value == '') {
                                                                            setValues((val: jsonObj) => ({ ...val, quantity: value }))
                                                                            setErrors((err: jsonObj) => ({ ...err, quantity: "" }))
                                                                        }
                                                                    }}
                                                                        onKeyPress={(event) => handleNumberKeyPress(event)}
                                                                    />
                                                                </Form.Group>
                                                                {errors.quantity && errDiv(errors.quantity)}
                                                            </div>
                                                        )
                                                    }

                                                    {
                                                        fieldsShow(values).dimensions && (
                                                            <>
                                                                <div className="col-md-6 pb-3">
                                                                    <Form.Group className="pb-2 form-box" controlId="formBasicEmail">
                                                                        {
                                                                            isDimension == '1'
                                                                                ?
                                                                                <>
                                                                                    <Form.Label>Cargo Dimensions<span className="required field">*</span></Form.Label>
                                                                                    <div className="flex_col">
                                                                                        <input type="number" min={1} placeholder="Length" value={cargoLWH.current.length ? cargoLWH.current.length : ""} onChange={(e) => {
                                                                                            let val = e.target.value
                                                                                            if (floatValidation(e)) {
                                                                                                cargoLWH.current = { ...cargoLWH.current, length: val }
                                                                                            }
                                                                                            setReuse(temp => temp + 1)
                                                                                        }}
                                                                                            onKeyPress={(event) => handleNumberKeyPress(event)}
                                                                                        />
                                                                                        <input type="number" min={1} placeholder="Width" value={cargoLWH.current.width ? cargoLWH.current.width : ""} onChange={(e) => {
                                                                                            let val = e.target.value
                                                                                            if (floatValidation(e)) {
                                                                                                cargoLWH.current = { ...cargoLWH.current, width: val }
                                                                                            }
                                                                                            setReuse(temp => temp + 1)
                                                                                        }}
                                                                                            onKeyPress={(event) => handleNumberKeyPress(event)}
                                                                                        />
                                                                                        <input type="number" min={1} placeholder="Height" value={cargoLWH.current.height ? cargoLWH.current.height : ""} onChange={(e) => {
                                                                                            let val = e.target.value
                                                                                            if (floatValidation(e)) {
                                                                                                cargoLWH.current = { ...cargoLWH.current, height: val }
                                                                                            }
                                                                                            setReuse(temp => temp + 1)
                                                                                        }}
                                                                                            onKeyPress={(event) => handleNumberKeyPress(event)}
                                                                                        />
                                                                                        <Select className="country-select-box" options={cargoDimensionOptions} placeholder="CM" styles={customStyles} value={cargoDimensionOptions.filter((d: any) => d.value == cargoLWH.current.unit)[0]} onChange={(e: any) => {
                                                                                            cargoLWH.current = { ...cargoLWH.current, unit: e.value }
                                                                                            setReuse(temp => temp + 1)
                                                                                        }}
                                                                                        />
                                                                                    </div>
                                                                                    <p className='mb-0 mt-2' style={{ color: "#F6A931", fontSize: "16px", cursor: "pointer" }}
                                                                                        onClick={() => {
                                                                                            setIsDimension("0")
                                                                                        }}
                                                                                    >
                                                                                        Enter {isDimension == "1" ? "Volume" : "Dimensions"} ?
                                                                                    </p>
                                                                                </>
                                                                                :
                                                                                <>
                                                                                    <Form.Label>Total Volume<span className="required field">*</span></Form.Label>
                                                                                    <div className='flex_col'>
                                                                                        <input type="number" placeholder="Enter volume" value={values.volume ? values.volume : ""} onChange={(e) => {
                                                                                            let value = e.target.value
                                                                                            if (regExPositiveInt.test(value) || value == '') {
                                                                                                setValues((val: jsonObj) => ({ ...val, volume: value }))
                                                                                                setErrors((err: jsonObj) => ({ ...err, cargoDimension: "" }))
                                                                                            }
                                                                                        }}
                                                                                            onKeyPress={(event) => handleNumberKeyPress(event)}
                                                                                        />
                                                                                        <Select onKeyDown={(e) => { e.preventDefault() }} className="country-select-box" options={totalvolumeoption} placeholder="CBM" styles={customStyles} />
                                                                                    </div>
                                                                                    <p className='mb-0 mt-2' style={{ color: "#F6A931", fontSize: "16px", cursor: "pointer" }} onClick={() => { setIsDimension("1") }}
                                                                                    >
                                                                                        Enter {isDimension == "1 " ? "Volume" : "Dimensions"} ?
                                                                                    </p>
                                                                                </>
                                                                        }
                                                                        {
                                                                            errors.cargoDimension && errDiv(errors.cargoDimension)
                                                                        }
                                                                    </Form.Group>
                                                                </div>
                                                            </>
                                                        )
                                                    }

                                                    <div className="col-md-6 pb-3">
                                                        <Form.Group className="form-box" controlId="formBasicEmail">
                                                            <Form.Label>Cargo Weight {values.movement?.slug != 'bulk' ? "(Per Container)" : ""}<span className="required field">*</span></Form.Label>
                                                            <div className="flex_col">
                                                                <input min={1} value={values.cargoWeight ? values.cargoWeight : ""} type="number" placeholder={`Enter${values.movement?.slug != 'bulk' ? " Container" : ""} Weight`} onChange={(e) => {
                                                                    let value = e.target.value
                                                                    if (floatValidation(e)) {
                                                                        setValues((val: jsonObj) => ({ ...val, cargoWeight: value }))
                                                                        setErrors((err: jsonObj) => ({ ...err, cargoWeight: "" }))
                                                                    }
                                                                }}
                                                                />

                                                                <Select onKeyDown={(e) => { e.preventDefault() }} value={cargoweightOptions.filter((op: jsonObj) => op.value == values.cargoWeightUnit)[0]} className="country-select-box" options={cargoweightOptions} placeholder="Kg" styles={customStyles} onChange={(e: any) =>
                                                                    setValues((val: jsonObj) => ({ ...val, cargoWeightUnit: e.value }))
                                                                }
                                                                />
                                                            </div>
                                                        </Form.Group>
                                                        {errors.cargoWeight && errDiv(errors.cargoWeight)}
                                                    </div>

                                                    <div className="col-md-6 pb-3">
                                                        <Form.Group>
                                                            <Form.Label>Commodity<span className="required field">*</span></Form.Label>
                                                            <input placeholder="Enter commodity" required={true} maxLength={100} value={values.selectedCommodity ? values.selectedCommodity : ""}
                                                                onChange={(e: any) => {
                                                                    let value = e.target.value
                                                                    if ((value && value.trim() != "") || value == '') {
                                                                        setValues((val: jsonObj) => ({ ...val, selectedCommodity: value }))
                                                                        setErrors((err: jsonObj) => ({ ...err, selectedCommodity: "" }))
                                                                    }
                                                                }}
                                                            />
                                                            {errors.selectedCommodity && errDiv(errors.selectedCommodity)}
                                                        </Form.Group>
                                                    </div>

                                                    <div className="col-md-12 my-3">
                                                        <Form.Group className="form-box radiocheckbox" controlId="formBasicEmail">
                                                            <Form.Label className="mb-0">Dangerous Goods Classification<span className="required field">*</span></Form.Label>
                                                            <div className="d-flex align-items-center ms-3">
                                                                <input checked={isDGCDoc == "Y" && true} type="radio" value="Y" name="DGC" onChange={(e: any) => setIsDGCDoc("Y")}
                                                                />
                                                                {" "}Yes
                                                                <input checked={isDGCDoc == "N" && true} type="radio" value="N" name="DGC" className="ms-3" onChange={(e: any) => setIsDGCDoc("N")} />
                                                                {" "}No
                                                            </div>

                                                            {isDGCDoc == "Y" ? (
                                                                <div className="upload_file_box">
                                                                    <Image src={Addimg} alt="" height="21px" width="21px" />
                                                                    <p className="py-1">MSDS</p>

                                                                    <OverlayTrigger delay={{ hide: 450, show: 300, }} placement="right"
                                                                        overlay={(props) => (
                                                                            <Tooltip {...props}> Material Safety Data Sheet</Tooltip>
                                                                        )}
                                                                    >
                                                                        <button className="btn" type="button">
                                                                            <input type="file"
                                                                                onChange={(e: any) => {
                                                                                    if (checkDocfile(e.target.files[0])) {
                                                                                        setDGCDoc(e.target.files[0])
                                                                                        setErrors((err: jsonObj) => ({ ...err, DGCDoc: "" }))
                                                                                    } else {
                                                                                        notify("warn", 'Please upload a image or document.')
                                                                                        return false
                                                                                    }
                                                                                }}
                                                                            />
                                                                            {DGCDoc
                                                                                ?
                                                                                <p className="msds-text">{DGCDoc.name}</p>
                                                                                : "Upload"}
                                                                        </button>
                                                                    </OverlayTrigger>
                                                                    {
                                                                        addedData.dgs_doc && (
                                                                            <a className="m-1" href={`${config.imageUrl}${addedData.dgs_doc}`} target="_blank" rel="noreferrer" style={{ color: "rgb(246, 169, 49)" }}>View uploaded document</a>
                                                                        )
                                                                    }
                                                                </div>
                                                            ) : ""
                                                            }
                                                        </Form.Group>
                                                        {errors.DGCDoc && errDiv(errors.DGCDoc)}
                                                    </div>

                                                    {
                                                        fieldsShow(values).attachPackage
                                                            ?
                                                            <div className="col-md-12">
                                                                <Form.Group className="form-box" controlId="formBasicEmail">
                                                                    <Form.Label>Attach Packing List{values.movement?.slug != 'bulk' ? <span className="required field">*</span> : ""}</Form.Label>
                                                                    <div className="imgprofile_box docinput">
                                                                        <input accept=".pdf,.doc,.docx,image/*" type="file" className="imginput" onChange={(e: any) => {
                                                                            if (checkDocfile(e.target.files[0])) {
                                                                                setPackingListDoc(e.target.files[0])
                                                                                setErrors((err: jsonObj) => ({ ...err, packingListDoc: "" }))
                                                                            } else {
                                                                                notify("warn", 'Please upload a image or document.')
                                                                            }
                                                                        }}
                                                                        />

                                                                        {
                                                                            packingListDoc ? packingListDoc.name
                                                                                : <img src="/images/docplaceholder.svg" alt="" />
                                                                        }
                                                                    </div>
                                                                </Form.Group>
                                                                {
                                                                    addedData?.attach_packing_list && (
                                                                        <div className="text-center py-3">
                                                                            <a href={`${config.imageUrl}${addedData?.attach_packing_list}`} target="_blank" rel="noreferrer" style={{ color: "rgb(246, 169, 49)" }}>View attached packing list</a>
                                                                        </div>
                                                                    )
                                                                }
                                                                {errors.packingListDoc && errDiv(errors.packingListDoc)}
                                                            </div>
                                                            :
                                                            ""
                                                    }

                                                    {
                                                        (values.mode?.slug == 'ocean') && ( // || values.mode?.slug == 'hybrid'
                                                            <>
                                                                <div className="col-md-6">
                                                                    <label htmlFor="time_origin">Free Time Origin<span className="required field">*</span></label>
                                                                    <input type="text" required={true} id="time_origin" placeholder="Free time origin (days)"
                                                                        value={values.freeTimeOrigin ? values.freeTimeOrigin : ""}
                                                                        maxLength={3}
                                                                        onChange={(e) => {
                                                                            let value = e.target.value
                                                                            if (regExPositiveInt.test(value) || value == '') {
                                                                                setValues((val: jsonObj) => ({ ...val, freeTimeOrigin: value }))
                                                                                setErrors((err: jsonObj) => ({ ...err, freeTimeOrigin: "" }))
                                                                            }
                                                                        }}
                                                                    />
                                                                    {/* <SelectField required={true} onKeyDown={(e: any) => e.preventDefault()} label="Free Time Origin" value={values.freeTimeOrigin?.value ? values.freeTimeOrigin : ""} options={timeoptions} onChange={(e: any) => {
                                                                        setValues((val: jsonObj) => ({ ...val, freeTimeOrigin: e }))
                                                                        setErrors((err: jsonObj) => ({ ...err, freeTimeOrigin: "" }))
                                                                    }}
                                                                    /> */}
                                                                    {errors.freeTimeOrigin && errDiv(errors.freeTimeOrigin)}
                                                                </div>
                                                                <div className="col-md-6">
                                                                    <label htmlFor="time_destination">Free Time Destination<span className="required field">*</span></label>
                                                                    <input type="text" required={true} id="time_destination" placeholder="Free time destination (days)"
                                                                        value={values.freeTimeDest ? values.freeTimeDest : ""}
                                                                        maxLength={3}
                                                                        onChange={(e) => {
                                                                            let value = e.target.value
                                                                            if (regExPositiveInt.test(value) || value == '') {
                                                                                setValues((val: jsonObj) => ({ ...val, freeTimeDest: value }))
                                                                                setErrors((err: jsonObj) => ({ ...err, freeTimeDest: "" }))
                                                                            }
                                                                        }}
                                                                    />
                                                                    {/* <SelectField required={true} onKeyDown={(e: any) => e.preventDefault()} label="Free Time Destination" value={values.freeTimeDest?.value ? values.freeTimeDest : ""} options={timeoptions} onChange={(e: any) => {
                                                                        setValues((val: jsonObj) => ({ ...val, freeTimeDest: e }))
                                                                        setErrors((err: jsonObj) => ({ ...err, freeTimeDest: "" }))
                                                                    }}
                                                                    /> */}
                                                                    {errors.freeTimeDest && errDiv(errors.freeTimeDest)}
                                                                </div>
                                                                <div className="col-md-12 mt-3">
                                                                    <div className="row">
                                                                        <div className="col-md-6">
                                                                            <Form.Group className="form-box" controlId="formBasicEmail">
                                                                                <DateField
                                                                                    showTime={false} minimumDate={new Date()} errors={errors} selectedDate={values.cargoReadinessDate}
                                                                                    dateKey={"cargoReadinessDate"} label={"Cargo Readiness Date"}
                                                                                    onDateChange={(date: Date) => {
                                                                                        setValues((val: jsonObj) => ({ ...val, cargoReadinessDate: date }))
                                                                                        setErrors((err: jsonObj) => ({ ...err, cargoReadinessDate: "" }))
                                                                                    }}

                                                                                />
                                                                            </Form.Group>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )
                                                    }
                                                    {
                                                        addresses > 0 && values.movement?.id ?
                                                            <p className="text-primary c-pointer" onClick={() => {
                                                                setAddressType("O")
                                                                setShowAddress(true)
                                                            }}>View saved Address</p>
                                                            : ""
                                                    }
                                                    <div className="row">
                                                        {
                                                            fieldsShow(values).originCountry && (
                                                                <div className="col-md-6 margin-bottom">
                                                                    <SelectField required={true} label="Origin Country" value={values.originCountry?.id ? values.originCountry : ""} options={shipmentData.countries} getOptionLabel={(op: any) => op.name} getOptionValue={(op: any) => op.id} onChange={(e: any) => {
                                                                        setValues((val: jsonObj) => ({ ...val, originCountry: e, originCity: {}, originPort: {}, originAddress: "" }))
                                                                        setErrors((err: jsonObj) => ({ ...err, originCountry: "", originAddress: "" }))
                                                                        if (fieldsShow(values).originAddressCity) {
                                                                            handleChangeCountry("O", e.id, {})
                                                                        }
                                                                        if (values.shipment?.slug == 'local') {
                                                                            handleChangeCountry("D", e.id, {})
                                                                        }
                                                                        setReuse(temp => temp + 1)
                                                                    }}
                                                                    />
                                                                    {errors.originCountry && errDiv(errors.originCountry)}
                                                                </div>
                                                            )
                                                        }

                                                        {
                                                            fieldsShow(values).originDestPort && (
                                                                <div className="col-md-6 margin-bottom">
                                                                    <SelectField required={true} label="Origin Port" value={values.originPort?.id ? values.originPort : ""} options={shipmentData.portList?.filter((p: any) => p.country == values.originCountry?.id)} getOptionLabel={(op: jsonObj) => op.port_name} getOptionValue={(op: jsonObj) => op.id}
                                                                        onChange={(e: jsonObj) => {
                                                                            setValues((val: jsonObj) => ({ ...val, originPort: e }))
                                                                            setErrors((err: jsonObj) => ({ ...err, originPort: "" }))
                                                                        }}
                                                                    />
                                                                    {errors.originPort && errDiv(errors.originPort)}
                                                                </div>
                                                            )
                                                        }


                                                        {
                                                            values.flow == 'I' && (
                                                                <div className="col-md-6">
                                                                    <SelectField required={true} label="Port Discharge" value={values.portDischarge?.id ? values.portDischarge : ""} options={shipmentData.portList} getOptionLabel={(op: jsonObj) => op.port_name} getOptionValue={(op: jsonObj) => op.id}
                                                                        onChange={(e: jsonObj) => {
                                                                            setValues((val: jsonObj) => ({ ...val, portDischarge: e }))
                                                                            setErrors((err: jsonObj) => ({ ...err, portDischarge: "" }))
                                                                        }}
                                                                    />
                                                                    {errors.portDischarge && errDiv(errors.portDischarge)}
                                                                </div>
                                                            )
                                                        }

                                                        {
                                                            fieldsShow(values).originAddressCity && (
                                                                <AddressCity {...OriginAddressProps} />
                                                            )
                                                        }
                                                    </div>
                                                    {
                                                        addresses > 0 && values.movement?.id ?
                                                            <p className="text-primary c-pointer" onClick={() => {
                                                                if (values.shipment?.slug == "local" && !values.originCountry?.id) {
                                                                    notify("warn", "Please select origin city.")
                                                                    return;
                                                                }
                                                                setAddressType("D")
                                                                if (values.shipment?.slug == "local" && values.originCountry?.id) {
                                                                    setFilterSavedAddress(values.originCountry.id)
                                                                }
                                                                setShowAddress(true)
                                                            }}>View saved Address</p> : ""
                                                    }
                                                    <div className="row">
                                                        {
                                                            fieldsShow(values).destCountry && (
                                                                <div className="col-md-6 margin-bottom">
                                                                    <SelectField required={true} label="Destination Country" value={values.destinationCountry?.id ? values.destinationCountry : ""} options={shipmentData.countries.filter((c: any) => c.id != values.originCountry?.id)} getOptionLabel={(op: any) => op.name} getOptionValue={(op: any) => op.id}
                                                                        onChange={(e: jsonObj) => {
                                                                            setValues((val: jsonObj) => ({ ...val, destinationCountry: e, destinationCity: {}, destinationPort: {}, destinationAddress: "" }))
                                                                            setErrors((err: jsonObj) => ({ ...err, destinationCountry: "", destinationAddress: "" }))
                                                                            if (fieldsShow(values).destAddressCity) {
                                                                                handleChangeCountry("D", e.id, {})
                                                                            }
                                                                            setReuse(temp => temp + 1)
                                                                        }}
                                                                    />
                                                                    {errors.destinationCountry && errDiv(errors.destinationCountry)}
                                                                </div>

                                                            )
                                                        }

                                                        {
                                                            fieldsShow(values).originDestPort && (
                                                                <div className="col-md-6 margin-bottom">
                                                                    <SelectField required={true} label="Destination Port" value={values.destinationPort?.id ? values.destinationPort : ""} options={shipmentData.portList?.filter((p: any) => p.country == values.destinationCountry?.id)} getOptionLabel={(op: jsonObj) => op.port_name} getOptionValue={(op: jsonObj) => op.id}
                                                                        onChange={(e: jsonObj) => {
                                                                            setValues((val: jsonObj) => ({ ...val, destinationPort: e }))
                                                                            setErrors((err: jsonObj) => ({ ...err, destinationPort: "" }))
                                                                        }}
                                                                    />
                                                                    {errors.destinationPort && errDiv(errors.destinationPort)}
                                                                </div>
                                                            )
                                                        }

                                                        {
                                                            values.flow == 'E' && (
                                                                <div className="col-md-6">
                                                                    <SelectField required={true} label="Loading Port" value={values.loadingPort?.id ? values.loadingPort : ""} options={shipmentData.portList} getOptionLabel={(op: jsonObj) => op.port_name} getOptionValue={(op: jsonObj) => op.id}
                                                                        onChange={(e: jsonObj) => {
                                                                            setValues((val: jsonObj) => ({ ...val, loadingPort: e }))
                                                                            setErrors((err: jsonObj) => ({ ...err, loadingPort: "" }))
                                                                        }}
                                                                    />
                                                                    {errors.loadingPort && errDiv(errors.loadingPort)}
                                                                </div>
                                                            )
                                                        }

                                                        {
                                                            fieldsShow(values).destAddressCity && (
                                                                <>
                                                                    <AddressCity {...DestAddressProps} />
                                                                </>
                                                            )
                                                        }
                                                    </div>

                                                    {
                                                        fieldsShow(values).timeOriginAddress && (
                                                            <div className="col-md-6 margin-bottom">
                                                                <DateField showTime={true} label={"Pickup Date and Time at Origin Address"} selectedDate={pickupDTOriginAddressDate} timeValue={pickupDTOriginAddressTime} errors={errors} dateKey={"pickupDTOriginAddressDate"} timeKey={"pickupDTOriginAddressTime"}
                                                                    minimumDate={new Date()}
                                                                    onDateChange={(date: Date) => {
                                                                        setPickupDTOriginAddressDate(date)
                                                                        if (new Date(pickupDTDestinationPortDate) < date) {
                                                                            setPickupDTDestinationPortDate(date)
                                                                        }
                                                                        if (new Date(deliveryDTOriginportDate) < date) {
                                                                            setDeliveryDTOriginPortDate(date)
                                                                        }
                                                                        if (new Date(deliveryDTDestinationAddressDate) < date) {
                                                                            setDeliveryDTDestinationAddressDate(date)
                                                                        }
                                                                        setErrors((err: jsonObj) => ({ ...err, pickupDTOriginAddressDate: "" }))
                                                                    }}
                                                                    onTimeChange={(e: any) => setPickupDTOriginAddressTime(e.target.value)}
                                                                />
                                                            </div>
                                                        )
                                                    }

                                                    {
                                                        fieldsShow(values).timeOriginPort && (
                                                            <div className="col-md-6 margin-bottom">
                                                                <DateField showTime={true} label={"Delivery Date and Time at Origin Port"} selectedDate={deliveryDTOriginportDate} timeValue={deliveryDTOriginportTime} errors={errors} dateKey={"deliveryDTOriginportDate"} timeKey={"deliveryDTOriginportTime"}
                                                                    minimumDate={pickupDTOriginAddressDate ? pickupDTOriginAddressDate : new Date()}
                                                                    onDateChange={(date: Date) => {
                                                                        setDeliveryDTOriginPortDate(date)
                                                                        if (new Date(pickupDTDestinationPortDate) < date) {
                                                                            setPickupDTDestinationPortDate(date)
                                                                        }
                                                                        if (new Date(deliveryDTDestinationAddressDate) < date) {
                                                                            setDeliveryDTDestinationAddressDate(date)
                                                                        }
                                                                        setErrors((err: jsonObj) => ({ ...err, deliveryDTOriginportDate: "" }))
                                                                    }}
                                                                    onTimeChange={(e: any) => {
                                                                        setDeliveryDTOriginportTime(e.target.value)
                                                                    }}
                                                                />
                                                            </div>
                                                        )
                                                    }

                                                    {
                                                        fieldsShow(values).timeDestPort
                                                        &&
                                                        (
                                                            <div className="col-md-6 margin-bottom">
                                                                <DateField showTime={true} label={"Pickup Date and Time at Destination Port"} selectedDate={pickupDTDestinationPortDate} timeValue={pickupDTDestinationPortTime} errors={errors} dateKey={"pickupDTDestinationPortDate"} timeKey={"pickupDTDestinationPortTime"}
                                                                    minimumDate={deliveryDTOriginportDate ? deliveryDTOriginportDate : new Date()}
                                                                    onDateChange={(date: Date) => {
                                                                        setPickupDTDestinationPortDate(date)
                                                                        if (new Date(deliveryDTDestinationAddressDate) < date) {
                                                                            setDeliveryDTDestinationAddressDate(date)
                                                                        }
                                                                        setErrors((err: jsonObj) => ({ ...err, pickupDTDestinationPortDate: "" }))
                                                                    }}
                                                                    onTimeChange={(e: any) => setPickupDTDestinationPortTime(e.target.value)}
                                                                />
                                                            </div>
                                                        )
                                                    }

                                                    {
                                                        fieldsShow(values).timeDestAddress && (
                                                            <div className="col-md-6 margin-bottom">
                                                                <DateField showTime={true} label={"Delivery Date and Time at Destination Address"} selectedDate={deliveryDTDestinationAddressDate} timeValue={deliveryDTDestinationAddressTime} errors={errors} dateKey={"deliveryDTDestinationAddressDate"} timeKey={"deliveryDTDestinationAddressTime"}
                                                                    minimumDate={pickupDTDestinationPortDate ? pickupDTDestinationPortDate : deliveryDTOriginportDate ? deliveryDTOriginportDate : pickupDTOriginAddressDate ? pickupDTOriginAddressDate : new Date()}
                                                                    onDateChange={(date: Date) => {
                                                                        setDeliveryDTDestinationAddressDate(date)
                                                                        setErrors((err: jsonObj) => ({ ...err, deliveryDTDestinationAddressDate: "" }))
                                                                    }}
                                                                    onTimeChange={(e: any) => setDeliveryDTDestinationAddressTime(e.target.value)}
                                                                />
                                                            </div>
                                                        )
                                                    }

                                                    <div className="col-md-12">
                                                        <Form.Group className="form-box" controlId="formBasicEmail">
                                                            <Form.Label>Terms and Conditions (optional)</Form.Label>
                                                            <Form.Control className="textarea" as="textarea" rows={3} maxLength={2000} placeholder="Enter terms and conditions." value={values.additionalComments} onChange={(e: any) => {
                                                                setValues((vals: jsonObj) => ({ ...vals, additionalComments: e.target.value }))
                                                            }}
                                                            />
                                                        </Form.Group>
                                                    </div>
                                                    <div className="col-md-12 next_btn text-center">
                                                        <button type="button" className="btn backbtn_1 my-4 mx-1" onClick={(e: any) => {
                                                            if (shipment_id) {
                                                                router.back()
                                                            } else {
                                                                handleClear()
                                                                set_next(false)
                                                            }
                                                        }}
                                                        >
                                                            Back
                                                        </button>
                                                        <button type="button" className="btn my-4 mx-1" onClick={(e: any) => handleAddShipment(e)}>
                                                            Submit
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </Form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div >
            </section >

            <Modal size="lg" show={createLandShipment} backdrop="static">
                {/*<Modal.Header>
                    <Modal.Title><h5>Saved Addresses</h5></Modal.Title>
                </Modal.Header>*/}
                <Modal.Body style={{ maxHeight: "300px", overflowY: "scroll" }}>
                    <b> Do you want to add a land shipment for your ocean cargo ? </b>
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-evenly">
                    <button className="btn verify-bt" onClick={() => {
                        setCreatelandShipment(false)
                        router.push("/shipments")
                    }}>No</button>
                    <button className="btn cpn-bt" onClick={() => setCreatelandShipment(false)}>Yes</button>
                </Modal.Footer>
            </Modal>

            <Modal size="lg" show={showAddress} backdrop="static">
                <Modal.Header>
                    <Modal.Title><h5>Saved Addresses</h5></Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: "426px", overflowY: "scroll" }}>
                    <AddressList filterbyCountryId={filterSavedAddress} address={addressType == 'D' ? chooseDestAddress : chooseOriginAddress} activePage={addressType == 'D' ? destAddressPage : originAddressPage} setActivePage={addressType == 'D' ? setDestAddressPage : setOriginAddressPage} listOnClick={(add: jsonObj) => {
                        addressType == 'D' ? setChooseDestAddress(add) : setChooseOriginAddress(add)
                    }} />
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-evenly">
                    <button className="btn verify-bt" onClick={() => {
                        setShowAddress(false)
                        setFilterSavedAddress("")
                        setDestAddressPage((page: number) => page != 0 && !Object.keys(chooseDestAddress).length ? 0 : page)
                        setOriginAddressPage((page: number) => page != 0 && !Object.keys(chooseOriginAddress).length ? 0 : page)
                    }}>Cancel</button>
                    <button className="btn cpn-bt" onClick={() => handleAddressSelect()}>Choose</button>
                </Modal.Footer>
            </Modal>
        </div >
    );
};

export default AddShipment;