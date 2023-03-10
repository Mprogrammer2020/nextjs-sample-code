import { Form } from "react-bootstrap"
import { jsonObj } from "../../helpers/validation"

interface ShipmentData {
    data: jsonObj
    userProfile: jsonObj
    bidStatus: string
}

const ShipmentStatus = ({ data, userProfile, bidStatus }: ShipmentData) => {

    function inTransitStatus() {
        if (data.milestones) {
            let firstMilestone = data.milestones[0]
            return (firstMilestone?.driver_assigned == '1' || firstMilestone?.is_completed == '1') && checkUncompletedMilestones().length ? true : false
        } else {
            return false
        }
    }

    function checkUncompletedMilestones() {
        if (data.milestones && data.milestones.length) {
            return data.milestones.filter((m: jsonObj) => m.is_completed == '0')
        }
        else return ["1"]
    }

    return (
        <Form>
            <Form.Group
                className="form-box mx-3"
                controlId="formBasicEmail"
            >
                <Form.Label>
                    Quotation Status
                </Form.Label> {
                    userProfile.account_type == 'S' ?
                        <Form.Control type="text" placeholder="" readOnly
                            value={data.status == '6' ? "Expired" :data.status == '5' ? "Cancelled" : data.accepted_quotation_id || data.bid_id ? "Accepted" : data.offersCount > 0 ? "Offered" : "New"}
                        />
                        :
                        <Form.Control type="text" placeholder="" readOnly
                            value={bidStatus == '2' ? "Rejected" : bidStatus == '1' ? "Accepted" : "Applied"}
                        />
                }
            </Form.Group>
            {
                bidStatus == '1' || userProfile.account_type == 'S'
                    ?
                    <Form.Group className="form-box mx-3" controlId="formBasicEmail">
                        <Form.Label>
                            Shipping Status
                        </Form.Label>
                        <Form.Control
                            type="text"
                            placeholder=""
                            readOnly
                            value={(data.delivered_by_carrier == "1" && userProfile.account_type == 'C') || (userProfile.account_type == 'S' && data.invoice?.admin_delivery_approved == '1') ? "Delivered" : inTransitStatus() ? "In-Transit" : data.status == '5' && userProfile.account_type == 'S' ? "Cancelled" : data.status == '6' && userProfile.account_type == 'S' ? "Expired" : "Pending"}
                        />
                    </Form.Group>
                    : ""
            }
        </Form>
    )
}

export default ShipmentStatus