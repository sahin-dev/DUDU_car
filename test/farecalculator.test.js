// __tests__/fareCalculator.test.js
const fareCalculator = require("../src/util/fareCalculator"); // adjust path
const Fare = require("../src/app/module/trip/Fare");
const isPeakHour = require("../src/util/isPeakHour");

jest.mock("../src/app/module/coupon/Coupon");
jest.mock("../src/app/module/trip/Fare");
jest.mock("../src/socket/emitError");
jest.mock("../src/util/isPeakHour");

const mockFindOne = (data) => ({
  lean: jest.fn().mockResolvedValue(data),  
});
describe("fareCalculator", () => {
  const socket = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Test for 25min and 8km ride, should return RM 20.50", async () => {
    Fare.findOne.mockReturnValue(mockFindOne({
      baseFare: 3,
      farePerKm: 0.34,
      farePerMin: 0.58,
      minFare: 6.5,
    }));
    isPeakHour.mockResolvedValue(false);

    const fare = await fareCalculator(socket, 25, 8000); // 25 mins, 8000m
    expect(fare).toBe(20.50);
  });

    it("Test for 15min and 6km ride, should resturn RM 14", async () => {
    Fare.findOne.mockReturnValue(mockFindOne({
      baseFare: 3,
      farePerKm: 0.34,
      farePerMin: 0.58,
      minFare: 6.5,
    }));
    isPeakHour.mockResolvedValue(false);

    const fare = await fareCalculator(socket, 15, 6000); // 15 mins, 6000m
    expect(fare).toBe(14);
  });


});
