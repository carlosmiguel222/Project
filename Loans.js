import React, { useState, useEffect } from "react";
import {
  Table,
  Space,
  Button,
  Row,
  Col,
  Modal,
  Form,
  Input,
  Tag,
  Spin,
  DatePicker,
  Tabs,
  Select,
  Divider,
  message,
} from "antd";
import {
  CheckCircleFilled,
  CheckCircleOutlined,
  EditOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import LoanService from "services/LoanService";
import Utils from "utils";
import moment from "moment";
import TextArea from "antd/es/input/TextArea";
import PayablesService from "services/PayablesService";

import dayjs from "dayjs";

const { Option } = Select;

const { formatNumber } = Utils;

const Loans = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [form] = Form.useForm();
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quincenaInputs, setQuincenaInputs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tableVisible, setTableVisible] = useState(true);
  const [unsavedPayables, setUnsavedPayables] = useState([]);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  console.log("message",currentRecord)
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value) {
      setTableVisible(true);
      const filteredData = dataSource.filter((loan) =>
        loan.name.toLowerCase().includes(value.toLowerCase())
      );
      setDataSource(filteredData);
    } else {
      setTableVisible(false);
      fetchLoans(); // Refetch the loans if search is cleared
    }
  };

  const showExtendModal = (record) => {
    setCurrentRecord(record);
    setIsExtendModalOpen(true);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    fetchLoans(); // Refetch the loans when 'X' is clicked
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await LoanService.getLoans({
        status: "pending",
      });

      setDataSource(res);
      setTableVisible(true); // Ensure the table is visible
    } catch (error) {
      console.error("Failed to fetch loans", error);
      setTableVisible(false); // Hide the table in case of an error
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (id, date, dateString) => {
    setUnsavedPayables((prev) => {
      // Check if the item with the given id exists
      const index = prev.findIndex((i) => i.id === id);

      if (index === -1) {
        // Item does not exist, add a new one
        const findPayable = currentRecord?.payables?.find((i) => i.id === id);

        const newPayee = {
          ...findPayable,
          id: id,
          due_date: dateString,
        };
        return [...prev, newPayee];
      } else {
        // Item exists, update it
        const updatedPayables = [...prev];
        updatedPayables[index] = {
          ...updatedPayables[index],
          due_date: dateString,
        };
        return updatedPayables;
      }
    });
    console.log(unsavedPayables, dateString);
  };

  const onChangePayables = (id, type, value) => {
    setUnsavedPayables((prev) => {
      // Check if the item with the given id exists
      const index = prev.findIndex((i) => i.id === id);

      if (index === -1) {
        // Item does not exist, add a new one
        const findPayable = currentRecord?.payables?.find((i) => i.id === id);

        const newPayee = {
          ...findPayable,
          id: id,
          [type]: value,
        };
        return [...prev, newPayee];
      } else {
        // Item exists, update it
        const updatedPayables = [...prev];
        updatedPayables[index] = {
          ...updatedPayables[index],
          [type]: value,
        };
        return updatedPayables;
      }
    });
  };

  const onSavePayables = async (id) => {
    try {
      const findPayable = unsavedPayables?.find((i) => i.id === id);
      console.log(unsavedPayables);
      console.log(findPayable);

      await PayablesService.updatePayable(id, findPayable);

      const getLoan = await LoanService.getLoanById(currentRecord?.id);

      setCurrentRecord(getLoan);
    } catch (error) {
      // message.error("Something went wrong.");
    }
  };

  const generateQuincenaInputs = (key, payable) => {
    const quincenaDate = moment(payable.due_date);
    const quincenaFormatted = quincenaDate.format("MMMM D, YYYY");

    const getPrevQuencena = currentRecord?.payables[key - 1];
    const getNextQuencena = currentRecord?.payables[key + 1];

    // Determine minDate
    const minDate =
      key - 1 < 0
        ? dayjs("0001-01-01", "YYYY-MM-DD")
        : dayjs(getPrevQuencena?.due_date, "YYYY-MM-DD").add(1, "day");

    // Determine maxDate
    const maxDate =
      key + 1 === currentRecord?.payables.length
        ? dayjs("9999-12-31", "YYYY-MM-DD")
        : dayjs(getNextQuencena?.due_date, "YYYY-MM-DD").subtract(1, "day");

    return (
      <>
        <Col span={10} className="mb-3">
          {/* <h5>{quincenaFormatted}</h5>
          <Input type="date" defaultValue={payable.due_date} /> */}

          <DatePicker
            key={new Date().getTime()}
            className="w-100"
            width={120}
            onChange={(date, dateString) =>
              handleDateChange(payable?.id, date, dateString)
            }
            value={
              unsavedPayables[key]?.due_date
                ? dayjs(unsavedPayables[key]?.due_date, "YYYY-MM-DD")
                : dayjs(payable.due_date, "YYYY-MM-DD")
            }
            minDate={minDate}
            maxDate={maxDate}
          />
        </Col>

        <Col span={12} key={payable.id} className="mb-1">
          <Input
            prefix={
              payable?.status !== "paid" || (
                <CheckCircleOutlined style={{ color: "green" }} />
              )
            }
            className="mb-3"
            onChange={(e) => {
              onChangePayables(payable?.id, "amount", e.target.value);
            }}
            addonAfter={
              <Select
                defaultValue={payable?.status}
                onChange={(e) => {
                  onChangePayables(payable?.id, "status", e);
                }}
              >
                <Option value="unpaid" style={{ color: "red" }}>
                  Unpaid
                </Option>
                <Option value="paid" style={{ color: "green" }}>
                  Paid
                </Option>
              </Select>
            }
            defaultValue={payable?.amount}
          />
        </Col>
        <Col span={2} style={{ textAlign: "right" }}>
          <Button
            size="small"
            type="text"
            icon={<SaveOutlined style={{ color: "green" }} />}
            onClick={() => onSavePayables(payable?.id)}
          ></Button>
        </Col>

        <Col span={24} key={payable.id} className="mb-1">
          <TextArea
            onChange={(e) => {
              onChangePayables(payable?.id, "description", e.target.value);
            }}
            defaultValue={payable?.description}
            placeholder="Add a note..."
            className="mb-2"
          />
        </Col>
        <Divider className="mt-3" />
      </>
    );
  };
  // Function to calculate the total amount payable
  const calculateTotalPayable = (quincena, payables) => {
    // Validate inputs
    if (!Array.isArray(payables) || typeof quincena !== "number") {
      console.error("Invalid data provided for quincena or payables");
      return 0; // Return 0 or handle the error as needed
    }

    // Count the number of payables
    const numberOfPayables = payables.length;

    // Calculate the total payable amount
    const totalPayable = quincena * numberOfPayables;

    return totalPayable;
  };

  // Safely calculate the total payable
  if (currentRecord && currentRecord.quincena && currentRecord.payables) {
    const totalPayable = calculateTotalPayable(
      currentRecord.quincena,
      currentRecord.payables
    );

    // Display the result, using formatNumber function
    console.log(`Total Payable: ${formatNumber(totalPayable)}`);
  } else {
    console.error("currentRecord is missing quincena or payables");
  }
  const showAddModal = () => {
    form.resetFields(); // Clear any existing form values
    setIsAddModalOpen(true);
  };
  

  const handleAddOk = async () => {
    try {
      const values = form.getFieldsValue();
      // Set the status to 'pending'
      const loanData = { ...values, status: "pending" };
      await LoanService.addLoan(loanData);
      fetchLoans();
      setIsAddModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error("Failed to add loan", error);
    }
  };

  const handleAddCancel = () => {
    setIsAddModalOpen(false);
    form.resetFields();
  };

  const showEditModal = (record) => {
    setCurrentRecord(record); // Set the current record
    form.setFieldsValue({
      ...record,
      date_loan: moment(record.date_loan), // Keep it as a moment object
    });
    setIsEditModalOpen(true); // Open the modal after setting the form values
  };
  useEffect(() => {
    if (currentRecord) {
      form.setFieldsValue({
        ...currentRecord,
        date_loan: moment(currentRecord.date_loan), // Format the date properly
      });
    }
  }, [currentRecord, form]);
  
  const handleEditOk = async () => {
    try {
      const values = form.getFieldsValue();

      await LoanService.updateLoan(currentRecord.id, values);
      // fetchLoans();
      // setIsEditModalOpen(false);
      // form.resetFields();

      window.location.reload();
    } catch (error) {
      console.error("Failed to update loan", error);
    }
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    form.resetFields();
  };

  const calculateQuincenaPayment = (amount, interest, monthsPayable) => {
    amount = Number(amount);
    interest = Number(interest);
    monthsPayable = Number(monthsPayable);

    if (!amount || !interest || !monthsPayable) return 0;

    const totalInterest = amount * (interest / 100);

    console.log(totalInterest);

    const interestPerQuincena = totalInterest / 2;

    console.log(interestPerQuincena);

    const months = monthsPayable * 2;
    const basePaymentPerQuincena = amount / months;

    console.log(amount);
    console.log(monthsPayable);
    console.log(basePaymentPerQuincena);
    console.log(interestPerQuincena);

    return basePaymentPerQuincena + interestPerQuincena;
  };

  const handleFormChange = () => {
    const values = form.getFieldsValue();
    const { amount, interest, months_payable, date_loan } = values;
    const paymentPerQuincena = calculateQuincenaPayment(
      amount,
      interest,
      months_payable
    );
    form.setFieldsValue({ quincena: paymentPerQuincena.toFixed(2) });
    generateQuincenaInputs(
      paymentPerQuincena,
      Array.from({ length: months_payable }, (_, index) =>
        paymentPerQuincena.toFixed(2)
      )
    );
  };

  useEffect(() => {
    fetchLoans();
    form.setFieldsValue({ quincena: 0 });
  }, [form]);

  const formItemLayout = {
    labelCol: { span: 24 },
    wrapperCol: { span: 24 },
  };

  const sumAmounts = (array) => {
    return (
      array?.reduce((total, item) => {
        return total + Number(item.amount);
      }, 0) || 0
    );
  };

  const onFinish = async (values) => {
    try {
      // Recalculate the total number of payables and payment per quincena
      const newMonthsPayable =
        currentRecord.months_payable + values.additional_months;
      const newInterest = values.interest;
      const amount = currentRecord.amount;

      const newPaymentPerQuincena = calculateQuincenaPayment(
        amount,
        newInterest,
        newMonthsPayable
      );

      // Prepare the updated loan data
      const updatedLoan = {
        ...currentRecord,
        date_loan: values.new_date_loan,
        months_payable: newMonthsPayable,
        interest: newInterest,
        quincena: newPaymentPerQuincena.toFixed(2), // Update the payment per quincena
      };

      // Call the service to update the loan
      await LoanService.updateLoan(updatedLoan.id, updatedLoan);

      message.success("Loan extended successfully!");
      setIsExtendModalOpen(false);
      fetchLoans(); // Refresh the list of loans
    } catch (error) {
      message.error("Failed to extend the loan.");
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => {
        return moment(date).format("MMMM D, YYYY");
      },
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },

    {
      title: "Address",
      dataIndex: "address",
      key: "address",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => {
        return formatNumber(amount);
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color = status === "Completed" ? "green" : "volcano";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "",
      key: "actions",
      align: "center",
      width: 50,
      render: (text, record) => (
        <Space size="middle">
          <Button
            size="small"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          />
        </Space>
        
      ),
    },
  ];

  return (
    <div>
      <h1>Loans</h1>

      <Row className="mb-3">
        <Col span={20}>
          <Input.Search
            type="search"
            style={{ width: 300 }}
            placeholder="Search"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <Button type="primary" onClick={searchTerm} style={{ marginLeft: 8 }}>
            Search
          </Button>
        </Col>
        <Col span={4} style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="primary" onClick={showAddModal}>
            Add Loan
          </Button>
        </Col>
      </Row>

      {/* {loading ? (
        <div style={{ textAlign: "center", margin: "20px 0" }}>
          <Spin size="small" />
        </div>
      ) : tableVisible ? ( */}
      <Table
        loading={loading}
        dataSource={dataSource}
        columns={columns}
        size="small"
        bordered
      />
      {/* ) : (
        <p>No loans found.</p>
      )} */}

      <Modal
        title="Add Loan"
        visible={isAddModalOpen}
        onOk={handleAddOk}
        onCancel={handleAddCancel}
        okText="Add"
      >
        <Form {...formItemLayout} form={form} onValuesChange={handleFormChange}>
          <Row>
            <Col span={24}>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item
                name="address"
                label="Address"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="date_loan"
                label="Date Loan"
                rules={[{ required: true }]}
              >
                <Input type="date" />
              </Form.Item>
              <Form.Item
                name="amount"
                label="Loan Amount"
                rules={[{ required: true }]}
              >
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="months_payable"
                label="Months Payable"
                rules={[{ required: true }]}
              >
                <Input type="number" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="interest"
                label="Interest Rate"
                rules={[{ required: true }]}
              >
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="quincena" label="Payment per Quincena">
            <Input type="number" readOnly />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit Loan"
        visible={isEditModalOpen}
        onOk={handleEditOk}
        onCancel={handleEditCancel}
        okText="Save"
        // footer={[]}
      >
        <Form
          {...formItemLayout}
          form={form}
          initialValues={currentRecord}
          onValuesChange={handleFormChange}
        >
          <Tabs
            defaultActiveKey="1"
            items={[
              {
                key: "1",
                label: "Details",
                children: (
                  <>
                    <Row>
                      <Col span={24}>
                        <Form.Item
                          name="name"
                          label="Name"
                          rules={[{ required: true }]}
                        >
                          <Input />
                        </Form.Item>
                        <Form.Item
                          name="address"
                          label="Address"
                          rules={[{ required: true }]}
                        >
                          <Input />
                        </Form.Item>
                        <Form.Item
                          name="address"
                          label="Notes"
                          rules={[{ required: true }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                   

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          name="date_loan"
                          label="Date Loan"
                          rules={[{ required: true }]}
                        >
                          <h5>
                            {moment(currentRecord?.date_loan).format(
                              "MMMM D, YYYY"
                            )}
                          </h5>
                        </Form.Item>

                        <Form.Item
                          name="amount"
                          label="Loan Amount"
                          rules={[{ required: true }]}
                        >
                          <h5> {formatNumber(currentRecord?.amount)} </h5>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="months_payable"
                          label="Months Payable"
                          rules={[{ required: true }]}
                        >
                          <h5>{currentRecord?.months_payable}</h5>
                        </Form.Item>
                        <Form.Item
                          name="interest"
                          label="Interest Rate"
                          rules={[{ required: true }]}
                        >
                          <h5> {currentRecord?.interest}% </h5>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row>
                      <Col span={12}>
                        <Form.Item name="quincena" label="Payment per Quincena">
                          <h5> {formatNumber(currentRecord?.quincena)} </h5>
                        </Form.Item>
                      </Col>

                      <Col span={12}>
                        <Form.Item name="status" label="Status">
                          <Select defaultValue={currentRecord?.status}>
                            <Option value="rejected" style={{ color: "red" }}>
                              Reject
                            </Option>
                            <Option
                              value="completed"
                              style={{ color: "green" }}
                            >
                              Complete
                            </Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: "2",
                label: "Payables (" + currentRecord?.payables?.length + ")",
                children: (
                  <Row gutter={12}>
                    <Col span={8}>
                      <Tag color="warning">
                        Paid:{" "}
                        {formatNumber(sumAmounts(currentRecord?.payables))}
                      </Tag>
                    </Col>
                    <Col span={8} className="text-right">
                      {currentRecord ? (
                        currentRecord.quincena &&
                        Array.isArray(currentRecord.payables) ? (
                          <Tag color="success">
                            Balance:{" "}
                            {formatNumber(
                              calculateTotalPayable(
                                parseFloat(currentRecord.quincena),
                                currentRecord.payables
                              ) - sumAmounts(currentRecord.payables)
                            )}
                          </Tag>
                        ) : (
                          <Tag color="warning">Balance: Data unavailable</Tag>
                        )
                      ) : (
                        <Tag color="error">Balance: Record not found</Tag>
                      )}
                    </Col>

                    <Col span={8} className="text-right">
                      {currentRecord &&
                      currentRecord.quincena &&
                      Array.isArray(currentRecord.payables) ? (
                        <Tag color="success">
                          Loan:{" "}
                          {formatNumber(
                            calculateTotalPayable(
                              parseFloat(currentRecord.quincena),
                              currentRecord.payables
                            )
                          )}
                        </Tag>
                      ) : (
                        <Tag color="warning">Loan: Data unavailable</Tag>
                      )}
                    </Col>

                    <Divider />

                    {currentRecord?.payables?.map((payable, key) =>
                      generateQuincenaInputs(key, payable)
                    )}
                  </Row>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
  </div>
  );
};

export default Loans;
