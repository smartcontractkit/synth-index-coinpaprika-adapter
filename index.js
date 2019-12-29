const rp = require('request-promise');
const snx = require('synthetix');
const Decimal = require('decimal.js');

const getPriceData = async () => {
    return rp({
        url: `https://api.coinpaprika.com/v1/tickers`,
        qs: {
            quotes: "USD"
        },
        json: true
    })
};

const calculateIndex = (indexes) => {
    let value = new Decimal(0);
    indexes.forEach(i => {
        value = value.plus(new Decimal(i.units).times(new Decimal(i.priceData.quotes.USD.price)));
    });
    return value.toNumber()
};

const createRequest = async (input, callback) => {
    const asset = input.data.asset || 'sCEX';
    const datas = snx.getSynths({network: 'mainnet'}).filter(({index, inverted}) => index && !inverted);
    const data = datas.find(d => d.name.toLowerCase() === asset.toLowerCase());
    const priceDatas = await getPriceData();
    await Promise.all(data.index.map(async (synth) => {
        synth.priceData = priceDatas.find(d => d.symbol.toLowerCase() === synth.symbol.toLowerCase())
    }));

    data.result = calculateIndex(data.index);

    callback(200, {
        jobRunID: input.id,
        data: data,
        result: data.result,
        statusCode: 200
    })
};

exports.gcpservice = (req, res) => {
    createRequest(req.body, (statusCode, data) => {
        res.status(statusCode).send(data)
    })
};

exports.handler = (event, context, callback) => {
    createRequest(event, (statusCode, data) => {
        callback(null, data)
    })
};

exports.handlerv2 = (event, context, callback) => {
    createRequest(JSON.parse(event.body), (statusCode, data) => {
        callback(null, {
            statusCode: statusCode,
            body: JSON.stringify(data),
            isBase64Encoded: false
        })
    })
};

module.exports.createRequest = createRequest;
