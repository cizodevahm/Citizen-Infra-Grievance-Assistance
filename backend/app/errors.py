class AppError(Exception):
    """Base class: any AppError becomes a clean JSON error response."""
    status = 400
    code = "BAD_REQUEST"

    def __init__(self, message, status=None, code=None):
        super().__init__(message)
        self.message = message
        if status is not None:
            self.status = status
        if code is not None:
            self.code = code


class ValidationError(AppError):
    status = 400
    code = "VALIDATION_ERROR"


class NotFoundError(AppError):
    status = 404
    code = "NOT_FOUND"


class RejectedError(AppError):
    """AI decided the submission is not a real complaint (selfie, blurry photo, ...)."""
    status = 422
    code = "COMPLAINT_REJECTED"


class AIError(AppError):
    status = 502
    code = "AI_ERROR"
