async def check_kafka(bootstrap_servers: str) -> dict:
    """Check Kafka broker connectivity for health/readiness probes."""
    try:
        from aiokafka import AIOKafkaProducer

        producer = AIOKafkaProducer(bootstrap_servers=bootstrap_servers)
        await producer.start()
        await producer.stop()
        return {"status": "ok", "bootstrap_servers": bootstrap_servers}
    except Exception as exc:
        return {"status": "down", "bootstrap_servers": bootstrap_servers, "error": str(exc)}
