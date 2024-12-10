import React, { useState, useEffect } from "react";
import { Row, Col, Card, Statistic, Spin } from "antd";
import LatestTransaction from "./LatestTransaction";
import DueDate from "./DueDate";
import StatusService from "services/StatusService";

const MyDashboard = () => {
  const [newLoanCount, setNewLoanCount] = useState(0);
  const [ongoingLoanCount, setOngoingLoanCount] = useState(0);
  const [completedLoanCount, setCompletedLoanCount] = useState(0);
  const [rejectedLoanCount, setRejectedLoanCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLoanCounts = async () => {
    setLoading(true);
    try {
      const res = await StatusService.getLoans();

      if (res && typeof res === "object") {
        setNewLoanCount(res.pending || 0); // New Loans (Pending)
        setOngoingLoanCount(res.ongoing || 0); // Ongoing Loans
        setCompletedLoanCount(res.completed || 0); // Completed Loans
        setRejectedLoanCount(res.rejected || 0); // Rejected Loans
      } else {
        console.error("Unexpected API response:", res);
      }
    } catch (error) {
      console.error("Failed to fetch loans", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanCounts();
  }, []);

  return (
    <>
      <h1>Dashboard</h1>
      <Row gutter={30}>
        <Col span={6}>
          <Card title="On Going" bordered={false}>
            {loading ? (
              <div style={{ textAlign: "center" }}>
                <Spin size="small" />
              </div>
            ) : (
              <Statistic title="On Going" value={ongoingLoanCount} />
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Completed" bordered={false}>
            {loading ? (
              <div style={{ textAlign: "center" }}>
                <Spin size="small" />
              </div>
            ) : (
              <Statistic title="Completed" value={completedLoanCount} />
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Rejected" bordered={false}>
            {loading ? (
              <div style={{ textAlign: "center" }}>
                <Spin size="small" />
              </div>
            ) : (
              <Statistic title="Rejected" value={rejectedLoanCount} />
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card title="New Loans" bordered={false}>
            {loading ? (
              <div style={{ textAlign: "center" }}>
                <Spin size="small" />
              </div>
            ) : (
              <Statistic title="New Loans" value={newLoanCount} />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16]}>
        {/* <Col span={12}>
          <DueDate />
        </Col> */}
        <Col span={24}>
          <LatestTransaction />
        </Col>
      </Row>
    </>
  );
};

export default MyDashboard;

