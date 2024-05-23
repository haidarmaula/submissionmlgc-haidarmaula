const predictClassification = require('../services/inferenceService');
const storeData = require('../services/storeData');
const InputError = require('../exceptions/InputError');
const { Firestore } = require('@google-cloud/firestore');
const crypto = require('crypto');

async function postPredictHandler(request, h) {
    const { image } = request.payload;
    const { model } = request.server.app;

    try {
        const { label, suggestion } = await predictClassification(model, image);
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        const data = {
            "id": id,
            "result": label,
            "suggestion": suggestion,
            "createdAt": createdAt
        }

        await storeData(id, data);

        const response = h.response({
            status: 'success',
            message: 'Model is predicted successfully',
            data
        });
        response.code(201);
        return response;
    } catch (error) {
        if (error instanceof InputError) {
            const response = h.response({
                status: 'fail',
                message: error.message
            });
            response.code(400);
            return response;
        }

        const response = h.response({
            status: 'fail',
            message: 'Terjadi kesalahan dalam melakukan prediksi'
        });
        response.code(400);
        return response;
    }
}

async function getPredictionHistoriesHandler(request, h) {
    try {
        const db = new Firestore();
        const predictCollection = db.collection('predictions');
        const snapshot = await predictCollection.get();

        const histories = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            histories.push({
                id: doc.id,
                history: {
                    result: data.result,
                    createdAt: data.createdAt,
                    suggestion: data.suggestion,
                    id: doc.id
                }
            });
        });

        return h.response({
            status: 'success',
            data: histories
        });
    } catch (error) {
        const response = h.response({
            status: 'fail',
            message: 'Failed to fetch prediction histories'
        });
        response.code(500);
        return response;
    }
}

module.exports = { postPredictHandler, getPredictionHistoriesHandler };
