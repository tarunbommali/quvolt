import useStudioDashboardController from '../../hooks/useStudioDashboardController';
import StudioDashboardView from '../../components/hostDashboard/HostDashboardView';

const HostStudioPage = () => {
    const dashboard = useStudioDashboardController();

    return (
        <StudioDashboardView dashboard={dashboard} />
    );
};

export default HostStudioPage;
