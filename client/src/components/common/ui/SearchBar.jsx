import { Search } from 'lucide-react';
import InputField from './InputField';
import { forms, cx } from '../../../styles/index';

const SearchBar = ({ value, onChange, placeholder = 'Search...', className = '' }) => {
    return (
        <div className={cx(forms.searchWrap, className)}>
            <Search className={forms.searchIcon} size={16} />
            <InputField
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className={forms.searchInputAddon}
            />
        </div>
    );
};

export default SearchBar;
