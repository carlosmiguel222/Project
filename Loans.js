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
  Radio,
  Tabs,
  Select,
  Divider,
  message,
} from "antd";
import {
  CheckCircleFilled,
  CheckCircleOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import LoanService from "services/LoanService";
import Utils from "utils";
import moment from "moment";
import TextArea from "antd/es/input/TextArea";
import PayablesService from "services/PayablesService";
import jsPDF from 'jspdf';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;


const { Option } = Select;

const { formatNumber } = Utils;

const Loans = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [form] = Form.useForm();
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quincenaInputs, setQuincenaInputs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tableVisible, setTableVisible] = useState(true);
  const [unsavedPayables, setUnsavedPayables] = useState([]);
 
  
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
  

  const generateReceipt = (record, totalPayable) => {
    if (!record || record.status !== "completed") {
        message.error("Receipt can only be generated for completed loans.");
        return;
    }

    // Calculate total payable amount
   
    const docDefinition = {
        content: [
            { text: 'Loan Receipt', style: 'header', fontSize: 24, bold: true, margin: [0, 0, 0, 20] },
            // Loan Details Table
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto'],
                    body: [
                        [{ text: 'Loan Details', style: 'header', colSpan: 2, bold: true }, {}],
                        ['Name', record.name],
                        ['Address', record.address],
                        ['Amount', formatNumber(record.amount)], // Use formatNumber function
                        ['Interest Rate', `${record.interest}%`],
                        ['Months Payable', record.months_payable],
                        ['Payment per Quincena', formatNumber(record.quincena)], // Use formatNumber function
                        ['Total Amount Paid', formatNumber(totalPayable)], // Add total payable
                        ['Status', record.status],
                        ['Date Loaned', moment(record.date_loan).format("MMMM D, YYYY")],
                        
                    ]
                },
                layout: 'lightHorizontalLines' // You can adjust the layout style
            },
            { text: 'Payables:', style: 'subheader', margin: [0, 20, 0, 10], bold: true },
            // Payables Table
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto'], // Adjust widths as necessary
                    body: [
                        [{ text: 'Description', bold: true }, { text: 'Amount', bold: true }, { text: 'Status', bold: true }, { text: 'Due Date', bold: true }],
                        ...record.payables.map(payable => [
                            payable.description || 'N/A',
                            formatNumber(payable.amount), // Use formatNumber function
                            payable.status,
                            payable.due_date
                        ])
                       
                    ]
                },
                layout: 'lightHorizontalLines' // You can adjust the layout style
            }
        ],
        defaultStyle: {
            font: 'Roboto', // Make sure you've embedded the Roboto font
            fontSize: 18 // Default font size for the document
        }
    };

    pdfMake.createPdf(docDefinition).download(`${record.name}_Loan_Receipt.pdf`);
};



  const handleClearSearch = () => {
    setSearchTerm("");
    fetchLoans(); // Refetch the loans when 'X' is clicked
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
        let res = await LoanService.getLoans();
        res = res?.filter((i) => i.status !== "pending");

        setDataSource(res);
        if (res.length > 0) {
            // Set currentRecord to the first loan or a specific loan based on your logic
            setCurrentRecord(res[0]); // or setCurrentRecord(selectedLoan) if you have a selection mechanism
        }
        setTableVisible(true);
    } catch (error) {
        console.error("Failed to fetch loans", error);
        setTableVisible(false);
    } finally {
        setLoading(false);
    }
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

      await PayablesService.updatePayable(id, findPayable);

      const getLoan = await LoanService.getLoanById(currentRecord?.id);

      setCurrentRecord(getLoan);
    } catch (error) {
      // message.error("Something went wrong.");
    }
  };

  const generateQuincenaInputs = (payable) => {
    const quincenaDate = moment(payable.due_date);
    const quincenaFormatted = quincenaDate.format("MMMM D, YYYY");

    return (
      <>
        <Col span={12}>
          <h5>{quincenaFormatted}</h5>
        </Col>
        <Col span={24} key={payable.id} className="mb-3">
          <Input
            readOnly
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
                disabled
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

          <TextArea
            readOnly
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

  const showAddModal = () => {
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

  const showViewModal = (record) => {
    setCurrentRecord(record);
    form.setFieldsValue({
      ...record,
      date_loan: moment(record.date_loan).format("YYYY-MM-DD"), // Format the date
    });
    const paymentPerQuincena = calculateQuincenaPayment(
      record.amount,
      record.interest,
      record.months_payable
    );
    generateQuincenaInputs(
      paymentPerQuincena,
      record.payables // Pass the payables array directly here
    );
    setIsViewModalOpen(true);
  };

  const handleViewOk = () => {
    setIsViewModalOpen(false);
    setCurrentRecord(null);
  };

  const handleViewCancel = () => {
    setIsViewModalOpen(false);
    setCurrentRecord(null);
  };

  const showEditModal = (record) => {
    setCurrentRecord(record);
    // form.setFieldsValue({
    //   ...record,
    //   date_loan: moment(record.date_loan).format("YYYY-MM-DD"), // Format the date
    // });
    // generateQuincenaInputs(record?.quincena, record.payables); // Generate inputs based on the payables array
    setIsEditModalOpen(true);
  };

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
  const columns = [
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
      title: "Status ",
      dataIndex: "status",
      width: 100,
      key: "status",
      render: (status) => {
        let color = status === "completed" ? "green" : "volcano";
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
            icon={<EyeOutlined />}
            onClick={() => showEditModal(record)}
            
          />
          <Button
            size="small"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => generateReceipt(record)} // This line calls generateReceipt with the specific record
            disabled={record.status !== "completed"} // Disable if not completed
          />
        
        </Space>
        
      ),
    },
  ];

  return (
    <div>
      <h1>History</h1>

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
        title="View Loan"
        visible={isEditModalOpen}
        onOk={() => setIsEditModalOpen(false)}
        onCancel={() => setIsEditModalOpen(false)}
        okText="Ok"
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
                          <Input readOnly />
                        </Form.Item>
                        <Form.Item
                          name="address"
                          label="Address"
                          rules={[{ required: true }]}
                        >
                          <Input readOnly />
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
                          <h5>{currentRecord?.months_payable} </h5>
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
                        <h5> {currentRecord?.completed} </h5>
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
                      
                  

                    {currentRecord?.payables?.map((payable) =>
                      generateQuincenaInputs(payable)
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

