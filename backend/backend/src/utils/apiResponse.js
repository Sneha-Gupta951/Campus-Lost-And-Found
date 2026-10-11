// Every successful response looks the same: { data: ... }
// This is what step "API design" meant by "decide the response shape once".
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
  }

  send(res) {
    return res.status(this.statusCode).json({ data: this.data });
  }
}

module.exports = ApiResponse;
