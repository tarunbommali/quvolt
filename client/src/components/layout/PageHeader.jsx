import React from 'react';
import BreadCrumbs from './BreadCrumbs';

// components/layout/PageHeader.jsx

const PageHeader = ({ breadcrumbs, actions }) => {
    return (
        <div className="flex justify-between  items-center gap-4 px-0  min-h-[24px]">
            <BreadCrumbs breadcrumbs={breadcrumbs} />
            {actions && (
                <div className="flex items-center ">
                    {actions}
                </div>
            )}
        </div>
    );
};

export default PageHeader;