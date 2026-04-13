import Section from '../layout/Section';
import Container from '../layout/Container';

/**
 * Trust point grid for the Home page.
 * @param {{ trustPoints: Array<{ label: string, icon: React.ComponentType }>} } props
 */
const HomeTrustGrid = ({ trustPoints }) => {
    return (
        <Section>
            <Container>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    {trustPoints.map((point) => {
                        const Icon = point.icon;

                        return (
                            <div key={point.label} className="flex flex-col items-center gap-2">
                                <Icon className="text-indigo-500" />
                                <span className="text-sm">{point.label}</span>
                            </div>
                        );
                    })}
                </div>
            </Container>
        </Section>
    );
};

export default HomeTrustGrid;
