import React from 'react';

const Section = ({ children, className = '', id = '' }) => {
  return (
    <section id={id} className={`relative overflow-hidden ${className}`}>
      {children}
    </section>
  );
};

export default Section;
