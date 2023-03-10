import { Form } from "react-bootstrap"
import Select, { GetOptionValue, GetOptionLabel } from "react-select"
import { jsonObj } from "../../helpers/validation";

interface SelectInterface {
    label: string
    required?: boolean
    value: jsonObj | string | undefined
    options: Array<any> | undefined
    onKeyDown?: any
    onInputChange?: any
    getOptionValue?: GetOptionValue<any>
    getOptionLabel?: GetOptionLabel<any>
    onChange: any
    isMulti?: boolean
}

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
};

const SelectField = ({ label="", required = false, value="", options, ...otherProps }: SelectInterface) => (
    <Form.Group className="form-box" controlId="formBasicEmail">
        <Form.Label>{label}{required ? <span className="required field">*</span> : ""}</Form.Label>
        <Select value={value} className="country-select-box" options={options} placeholder={"Select"} styles={customStyles} {...otherProps} />
    </Form.Group>
)

export { SelectField }