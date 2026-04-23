import { forms, cx } from '../../../styles/index';


const InputField = ({ className = '', ...props }) => {
    return (
        <input
            className={cx(forms.inputField, className)}
            {...props}
        />
    );
};

export default InputField;
