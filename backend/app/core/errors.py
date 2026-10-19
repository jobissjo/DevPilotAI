class ServiceError(Exception):
    """Application failure translated to HTTP at the API boundary."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)
