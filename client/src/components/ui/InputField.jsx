import { forms } from '../../styles/forms';
import { cx } from '../../styles/theme';

const InputField = ({ className = '', ...props }) => {
    return (
        <input
            className={cx(forms.inputField, className)}
            {...props}
        />
    );
};

export default InputField;
