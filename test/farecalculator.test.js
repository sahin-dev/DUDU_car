// __tests__/fareCalculator.test.js
const fareCalculator = require("../src/util/fareCalculator"); // adjust path
const Coupon = require("../src/app/module/coupon/Coupon");
const Fare = require("../src/app/module/trip/Fare");
const emitError = require("../src/socket/emitError");
const isPeakHour = require("../src/util/isPeakHour");

jest.mock("../src/app/module/coupon/Coupon");
jest.mock("../src/app/module/trip/Fare");
jest.mock("../src/socket/emitError");
jest.mock("../src/util/isPeakHour");

const mockFindOne = (data) => ({
  lean: jest.fn().mockResolvedValue(data),  // .lean() returns a Promise
});
describe("fareCalculator", () => {
  const socket = {}; // dummy socket object

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("test 1", async () => {
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

    it("test 2", async () => {
    Fare.findOne.mockReturnValue(mockFindOne({
      baseFare: 3,
      farePerKm: 0.34,
      farePerMin: 0.58,
      minFare: 6.5,
    }));
    isPeakHour.mockResolvedValue(false);

    const fare = await fareCalculator(socket, 15, 6000); // 25 mins, 8000m
    expect(fare).toBe(14);
  });


});
